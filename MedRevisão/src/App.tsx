import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar as CalendarIcon, 
  LogOut, 
  BarChart3,
  Clock,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from './contexts/AuthContext';

// Components
import Dashboard from './components/Dashboard';
import SubjectList from './components/SubjectList';
import CalendarView from './components/CalendarView';
import ProfileView from './components/ProfileView';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const { user, profile, loading, globalStats } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'subjects' | 'calendar' | 'profile'>('dashboard');

  console.log("App Render - Loading:", loading, "User:", user?.uid);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center">
        <div className="font-mono text-sm animate-pulse">CARREGANDO SISTEMA...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white border border-[#141414] p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]"
        >
          <h1 className="font-serif italic text-4xl mb-2 text-[#141414]">MedRevise</h1>
          <p className="font-sans text-sm text-[#141414]/60 mb-8 uppercase tracking-widest">
            Sistema de Revisão Espaçada para Estudantes
          </p>
          
          <button
            onClick={handleLogin}
            className="w-full bg-[#141414] text-[#E4E3E0] py-4 font-mono text-sm hover:bg-[#141414]/90 transition-colors flex items-center justify-center gap-3"
          >
            ENTRAR COM GOOGLE
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex text-[#141414]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#141414] flex flex-col bg-white">
        <div className="p-6 border-bottom border-[#141414]">
          <h2 className="font-serif italic text-2xl">MedRevise</h2>
          <p className="text-[10px] font-mono opacity-50 uppercase mt-1">v1.0.0-stable</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={18} />}
            label="DASHBOARD"
          />
          <NavButton 
            active={activeTab === 'subjects'} 
            onClick={() => setActiveTab('subjects')}
            icon={<BookOpen size={18} />}
            label="MATÉRIAS"
          />
          <NavButton 
            active={activeTab === 'calendar'} 
            onClick={() => setActiveTab('calendar')}
            icon={<CalendarIcon size={18} />}
            label="CALENDÁRIO"
          />
          <NavButton 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')}
            icon={<UserIcon size={18} />}
            label="PERFIL"
          />
        </nav>

        <div className="p-4 border-t border-[#141414]">
          <div className="flex items-center gap-3 mb-4 p-2 cursor-pointer hover:bg-[#141414]/5 transition-colors" onClick={() => setActiveTab('profile')}>
            <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-[#141414]" />
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">{user.displayName}</p>
              <p className="text-[10px] opacity-50 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 p-2 text-[10px] font-mono hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
          >
            <LogOut size={14} />
            SAIR DO SISTEMA
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 border-b border-[#141414] bg-white flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono opacity-50 uppercase tracking-widest">SESSÃO ATIVA:</span>
            <span className="text-[10px] font-mono font-bold uppercase">{activeTab}</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <StatItem 
                icon={<BarChart3 size={14} />} 
                label="QUESTÕES" 
                value={globalStats.questions >= 1000 ? `${(globalStats.questions / 1000).toFixed(1)}k` : globalStats.questions.toString()} 
              />
              <StatItem 
                icon={<Clock size={14} />} 
                label="TEMPO" 
                value={`${Math.floor(globalStats.time / 60)}h`} 
              />
            </div>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'subjects' && <SubjectList />}
              {activeTab === 'calendar' && <CalendarView />}
              {activeTab === 'profile' && <ProfileView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 text-[11px] font-mono transition-all border border-transparent",
        active ? "bg-[#141414] text-[#E4E3E0] border-[#141414]" : "hover:bg-[#141414]/5"
      )}
    >
      {icon}
      <span className="tracking-widest">{label}</span>
    </button>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="opacity-40">{icon}</div>
      <div className="flex flex-col">
        <span className="text-[8px] font-mono opacity-50 leading-none">{label}</span>
        <span className="text-xs font-mono font-bold leading-none mt-0.5">{value}</span>
      </div>
    </div>
  );
}
