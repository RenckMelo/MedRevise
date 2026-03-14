import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { google } from 'googleapis';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    } else {
      // Fallback or skip if not available
      console.warn('firebase-applet-config.json not found, skipping admin init');
    }
  } catch (e) {
    console.error('Failed to load firebase config for admin:', e);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/auth/callback`
  );

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('WARNING: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Google Calendar sync will not work.');
  }

  // Auth URL endpoint
  app.get('/api/auth/google/url', (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).send('userId required');

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state: userId, // Pass userId in state to associate tokens on callback
      prompt: 'consent'
    });
    res.json({ url });
  });

  // OAuth Callback
  app.get('/auth/callback', async (req, res) => {
    const { code, state: userId } = req.query;
    
    if (!code || !userId) {
      return res.status(400).send('Missing code or userId');
    }

    try {
      if (!db) return res.status(500).send('Database not initialized');
      
      const { tokens } = await oauth2Client.getToken(code as string);
      
      // Store tokens in Firestore
      await db.collection('users').doc(userId as string).collection('secrets').doc('googleCalendar').set({
        tokens,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #E4E3E0;">
            <div style="text-align: center; border: 1px solid #141414; padding: 2rem; background: white; box-shadow: 8px 8px 0 0 #141414;">
              <h1 style="font-style: italic;">Conectado!</h1>
              <p>O Google Calendar foi sincronizado com sucesso.</p>
              <p>Esta janela fechará automaticamente.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                  setTimeout(() => window.close(), 2000);
                } else {
                  window.location.href = '/';
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error exchanging code:', error);
      res.status(500).send('Authentication failed');
    }
  });

  // Sync endpoint
  app.post('/api/calendar/sync', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).send('userId required');
    if (!db) return res.status(500).send('Database not initialized');

    try {
      const secretDoc = await db.collection('users').doc(userId).collection('secrets').doc('googleCalendar').get();
      if (!secretDoc.exists) return res.status(404).send('Not connected to Google');

      const { tokens } = secretDoc.data()!;
      oauth2Client.setCredentials(tokens);

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // 1. Get events from Google
      const googleEvents = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
      });

      // 2. Save to Firestore
      const batch = db.batch();
      const eventsCollection = db.collection('users').doc(userId).collection('calendarEvents');
      
      // For simplicity, we'll just add new ones or update existing by googleEventId
      for (const gEvent of googleEvents.data.items || []) {
        if (!gEvent.id) continue;
        
        const q = await eventsCollection.where('googleEventId', '==', gEvent.id).get();
        const data = {
          title: gEvent.summary || 'Sem título',
          description: gEvent.description || '',
          start: gEvent.start?.dateTime || gEvent.start?.date || '',
          end: gEvent.end?.dateTime || gEvent.end?.date || '',
          googleEventId: gEvent.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (q.empty) {
          batch.set(eventsCollection.doc(), data);
        } else {
          batch.update(q.docs[0].ref, data);
        }
      }

      // 3. Push local events to Google (that don't have googleEventId)
      const localEvents = await eventsCollection.where('googleEventId', '==', null).get();
      for (const lDoc of localEvents.docs) {
        const lData = lDoc.data();
        const createdEvent = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: lData.title,
            description: lData.description,
            start: { dateTime: lData.start },
            end: { dateTime: lData.end },
          },
        });
        batch.update(lDoc.ref, { googleEventId: createdEvent.data.id });
      }

      await batch.commit();
      res.json({ success: true });
    } catch (error) {
      console.error('Sync error:', error);
      res.status(500).json({ error: 'Sync failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
