import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CalendarEvent, Topic } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';

export default function CalendarView() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    start: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    description: ''
  });

  useEffect(() => {
    if (!user) return;
    const eventQuery = query(collection(db, 'users', user.uid, 'calendarEvents'));
    const topicQuery = query(collection(db, 'users', user.uid, 'topics'));

    const unsubEvents = onSnapshot(eventQuery, (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent)));
    });
    const unsubTopics = onSnapshot(topicQuery, (snap) => {
      setTopics(snap.docs.map(d => ({ id: d.id, ...d.data() } as Topic)));
      setLoading(false);
    });

    return () => {
      unsubEvents();
      unsubTopics();
    };
  }, [user?.uid]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const addEvent = async () => {
    if (!user || !newEvent.title.trim()) return;
    await addDoc(collection(db, 'users', user.uid, 'calendarEvents'), {
      ...newEvent,
      createdAt: new Date().toISOString()
    });
    setNewEvent({
      title: '',
      start: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      description: ''
    });
    setShowEventForm(false);
  };

  const handleSync = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });

      if (response.status === 404) {
        // Not connected, start OAuth flow
        const urlRes = await fetch(`/api/auth/google/url?userId=${user.uid}`);
        const { url } = await urlRes.json();
        
        const authWindow = window.open(url, 'google_auth', 'width=600,height=700');
        if (!authWindow) {
          alert('Por favor, permita popups para conectar ao Google Calendar.');
        }
        return;
      }

      if (response.ok) {
        alert('Sincronização concluída com sucesso!');
      } else {
        throw new Error('Falha na sincronização');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Erro ao sincronizar com o Google Calendar.');
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        handleSync(); // Retry sync after successful auth
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between bg-white border border-[#141414] p-4">
        <div className="flex items-center gap-4">
          <h2 className="font-serif italic text-2xl capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <div className="flex gap-1">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-[#141414]/5 border border-[#141414]">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-[#141414]/5 border border-[#141414]">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleSync}
            className="flex items-center gap-2 px-4 py-2 border border-[#141414] font-mono text-[10px] uppercase hover:bg-[#141414]/5"
          >
            <RefreshCw size={14} />
            Sincronizar Google
          </button>
          <button 
            onClick={() => setShowEventForm(true)}
            className="flex items-center gap-2 bg-[#141414] text-[#E4E3E0] px-4 py-2 font-mono text-[10px] uppercase hover:bg-[#141414]/90"
          >
            <Plus size={14} />
            Novo Compromisso
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 border-l border-t border-[#141414] bg-white">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="p-4 border-r border-b border-[#141414] bg-[#141414]/5 text-center font-mono text-[10px] font-bold uppercase tracking-widest">
            {day}
          </div>
        ))}
        {calendarDays.map((day, i) => {
          const dayEvents = events.filter(e => isSameDay(parseISO(e.start), day));
          const dayReviews = topics.filter(t => t.nextReviewDate && isSameDay(parseISO(t.nextReviewDate), day));
          
          return (
            <div 
              key={i} 
              className={cn(
                "min-h-[120px] p-2 border-r border-b border-[#141414] transition-colors",
                !isSameMonth(day, monthStart) ? "bg-[#141414]/5 opacity-30" : "bg-white",
                isToday(day) && "bg-yellow-50"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={cn(
                  "text-[10px] font-mono font-bold",
                  isToday(day) && "bg-[#141414] text-[#E4E3E0] px-1"
                )}>
                  {format(day, 'd')}
                </span>
              </div>
              
              <div className="space-y-1">
                {/* Manual Events */}
                {dayEvents.map(event => (
                  <div key={event.id} className="text-[9px] font-mono p-1 bg-[#141414] text-[#E4E3E0] truncate border border-[#141414]">
                    {event.title}
                  </div>
                ))}
                
                {/* Auto Reviews */}
                {dayReviews.map(topic => (
                  <div key={topic.id} className="text-[9px] font-mono p-1 border border-[#141414] text-[#141414] truncate italic flex items-center gap-1">
                    <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></div>
                    REVISÃO: {topic.name}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#141414] p-8 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
            <h3 className="font-serif italic text-2xl mb-6">Novo Compromisso</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase mb-1">Título</label>
                <input 
                  type="text" 
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  className="w-full p-2 border border-[#141414] font-mono text-sm focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase mb-1">Início</label>
                  <input 
                    type="datetime-local" 
                    value={newEvent.start}
                    onChange={(e) => setNewEvent({...newEvent, start: e.target.value})}
                    className="w-full p-2 border border-[#141414] font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase mb-1">Fim</label>
                  <input 
                    type="datetime-local" 
                    value={newEvent.end}
                    onChange={(e) => setNewEvent({...newEvent, end: e.target.value})}
                    className="w-full p-2 border border-[#141414] font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase mb-1">Descrição</label>
                <textarea 
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  className="w-full p-2 border border-[#141414] font-mono text-sm focus:outline-none h-24"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setShowEventForm(false)}
                className="flex-1 border border-[#141414] py-3 font-mono text-[10px] uppercase hover:bg-[#141414]/5"
              >
                CANCELAR
              </button>
              <button 
                onClick={addEvent}
                className="flex-1 bg-[#141414] text-[#E4E3E0] py-3 font-mono text-[10px] uppercase hover:bg-[#141414]/90"
              >
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
