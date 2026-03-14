import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Mail, Calendar, Target, Shield, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ProfileView() {
  const { user, profile } = useAuth();
  const [dailyGoal, setDailyGoal] = useState(profile?.settings?.dailyGoalMinutes || 60);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'settings.dailyGoalMinutes': dailyGoal
      });
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white border border-[#141414] p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <img 
            src={profile.photoURL || ''} 
            alt={profile.displayName || ''} 
            className="w-32 h-32 border-2 border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]"
          />
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="font-serif italic text-3xl">{profile.displayName}</h2>
              <p className="font-mono text-xs opacity-50 uppercase tracking-widest">Estudante MedRevise</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem icon={<Mail size={14} />} label="EMAIL" value={profile.email || 'N/A'} />
              <InfoItem icon={<Calendar size={14} />} label="MEMBRO DESDE" value={format(parseISO(profile.createdAt), 'dd/MM/yyyy')} />
              <InfoItem icon={<Shield size={14} />} label="ID DO SISTEMA" value={profile.uid.substring(0, 12) + '...'} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Settings */}
        <div className="bg-white border border-[#141414] p-8 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
          <div className="flex items-center gap-2 mb-6">
            <Target size={18} />
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest">Metas de Estudo</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block font-mono text-[10px] opacity-50 uppercase mb-2">Meta Diária (Minutos)</label>
              <input 
                type="number" 
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                className="w-full border border-[#141414] p-3 font-mono text-sm focus:outline-none focus:bg-[#141414]/5"
              />
            </div>
            
            <button 
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full bg-[#141414] text-[#E4E3E0] py-3 font-mono text-[10px] uppercase tracking-widest hover:bg-[#141414]/90 transition-all flex items-center justify-center gap-2"
            >
              <Save size={14} />
              {isSaving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
            </button>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white border border-[#141414] p-8 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] flex flex-col justify-center items-center text-center space-y-4">
          <div className="w-16 h-16 bg-[#141414]/5 flex items-center justify-center rounded-full">
            <User size={32} className="opacity-20" />
          </div>
          <div>
            <h4 className="font-serif italic text-lg">Privacidade & Dados</h4>
            <p className="text-[10px] font-mono opacity-50 mt-2">
              Seus dados são armazenados de forma segura e criptografada. 
              Você tem controle total sobre suas informações de sincronização.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[#141414]/5 border border-transparent hover:border-[#141414]/10 transition-all">
      <div className="opacity-40">{icon}</div>
      <div>
        <p className="text-[8px] font-mono opacity-50 leading-none uppercase">{label}</p>
        <p className="text-xs font-mono font-bold mt-1">{value}</p>
      </div>
    </div>
  );
}
