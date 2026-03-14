import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { StudySession } from '../types';
import { 
  startOfWeek, 
  startOfMonth, 
  isAfter, 
  parseISO, 
  format, 
  subDays,
  eachDayOfInterval
} from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { BarChart3, Clock, Target, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'studySessions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudySession));
      setSessions(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const stats = {
    week: sessions.filter(s => isAfter(parseISO(s.date), weekStart)),
    month: sessions.filter(s => isAfter(parseISO(s.date), monthStart)),
    total: sessions
  };

  const calculateTotals = (data: StudySession[]) => {
    const totalQuestions = data.reduce((acc, s) => acc + s.questionsCount, 0);
    return {
      questions: totalQuestions,
      correct: data.reduce((acc, s) => acc + s.correctCount, 0),
      time: data.reduce((acc, s) => acc + s.studyTimeMinutes, 0),
      accuracy: totalQuestions > 0 
        ? (data.reduce((acc, s) => acc + s.correctCount, 0) / totalQuestions * 100).toFixed(1)
        : 0
    };
  };

  const weekTotals = calculateTotals(stats.week);
  const monthTotals = calculateTotals(stats.month);
  const totalTotals = calculateTotals(stats.total);

  // Chart data for last 7 days
  const last7Days = eachDayOfInterval({
    start: subDays(now, 6),
    end: now
  }).map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const daySessions = sessions.filter(s => s.date.startsWith(dateStr));
    return {
      name: format(date, 'EEE'),
      questions: daySessions.reduce((acc, s) => acc + s.questionsCount, 0),
      time: daySessions.reduce((acc, s) => acc + s.studyTimeMinutes, 0),
    };
  });

  if (loading) return <div className="font-mono text-xs opacity-50">PROCESSANDO DADOS...</div>;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h2 className="font-serif italic text-4xl text-[#141414]">Olá, {profile?.displayName?.split(' ')?.[0] || 'Estudante'}</h2>
        <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest mt-2">
          {sessions.length > 0 
            ? `Você já completou ${sessions.length} sessões de estudo. Continue assim!`
            : 'Bem-vindo ao MedRevise. Vamos começar sua primeira sessão?'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="ESTA SEMANA" 
          questions={weekTotals.questions} 
          time={weekTotals.time} 
          accuracy={Number(weekTotals.accuracy)}
          icon={<TrendingUp size={20} />}
        />
        <StatCard 
          title="ESTE MÊS" 
          questions={monthTotals.questions} 
          time={monthTotals.time} 
          accuracy={Number(monthTotals.accuracy)}
          icon={<BarChart3 size={20} />}
        />
        <StatCard 
          title="TOTAL ACUMULADO" 
          questions={totalTotals.questions} 
          time={totalTotals.time} 
          accuracy={Number(totalTotals.accuracy)}
          icon={<Target size={20} />}
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white border border-[#141414] p-8 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-serif italic text-xl">Desempenho Recente</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#141414]"></div>
              <span className="text-[10px] font-mono uppercase">Questões</span>
            </div>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#14141410" />
              <XAxis 
                dataKey="name" 
                axisLine={{ stroke: '#141414' }} 
                tickLine={false}
                tick={{ fontSize: 10, fontFamily: 'monospace' }}
              />
              <YAxis 
                axisLine={{ stroke: '#141414' }} 
                tickLine={false}
                tick={{ fontSize: 10, fontFamily: 'monospace' }}
              />
              <Tooltip 
                cursor={{ fill: '#14141405' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #141414',
                  borderRadius: '0px',
                  fontFamily: 'monospace',
                  fontSize: '10px'
                }}
              />
              <Bar dataKey="questions" fill="#141414">
                {last7Days.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 6 ? '#141414' : '#14141480'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white border border-[#141414] overflow-hidden">
        <div className="p-4 border-b border-[#141414] bg-[#141414]/5">
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest">Últimas Sessões</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#141414]">
                <th className="p-4 font-serif italic text-xs font-normal">Data</th>
                <th className="p-4 font-serif italic text-xs font-normal">Questões</th>
                <th className="p-4 font-serif italic text-xs font-normal">Acertos</th>
                <th className="p-4 font-serif italic text-xs font-normal">Tempo</th>
                <th className="p-4 font-serif italic text-xs font-normal">Precisão</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 5).map((s) => (
                <tr key={s.id} className="border-b border-[#141414]/10 hover:bg-[#141414]/5 transition-colors">
                  <td className="p-4 font-mono text-[10px]">{format(parseISO(s.date), 'dd/MM/yyyy HH:mm')}</td>
                  <td className="p-4 font-mono text-[10px]">{s.questionsCount}</td>
                  <td className="p-4 font-mono text-[10px]">{s.correctCount}</td>
                  <td className="p-4 font-mono text-[10px]">{s.studyTimeMinutes}m</td>
                  <td className="p-4 font-mono text-[10px] font-bold">
                    {s.questionsCount > 0 ? ((s.correctCount / s.questionsCount) * 100).toFixed(0) : 0}%
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center font-mono text-[10px] opacity-50">
                    NENHUMA SESSÃO REGISTRADA AINDA.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, questions, time, accuracy, icon }: { title: string, questions: number, time: number, accuracy: number, icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-50">{title}</span>
        <div className="opacity-20">{icon}</div>
      </div>
      <div className="space-y-4">
        <div>
          <div className="text-3xl font-serif italic">{questions}</div>
          <div className="text-[10px] font-mono uppercase opacity-50">Questões Resolvidas</div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#141414]/10">
          <div>
            <div className="text-lg font-mono font-bold">{Math.floor(time / 60)}h {time % 60}m</div>
            <div className="text-[8px] font-mono uppercase opacity-50">Tempo de Estudo</div>
          </div>
          <div>
            <div className="text-lg font-mono font-bold">{accuracy}%</div>
            <div className="text-[8px] font-mono uppercase opacity-50">Precisão Média</div>
          </div>
        </div>
      </div>
    </div>
  );
}
