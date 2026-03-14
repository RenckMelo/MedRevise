import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { Subject, Topic, StudySession } from '../types';
import { Plus, Trash2, BookOpen, ChevronRight, History, BarChart2, Clock, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { accuracyToQuality, calculateNextReview } from '../utils/srs';

export default function SubjectList() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newSubjectName, setNewSubjectName] = useState('');
  const [showAddSubject, setShowAddSubject] = useState(false);
  
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  
  const [showSessionForm, setShowSessionForm] = useState<Topic | null>(null);
  const [sessionData, setSessionData] = useState({
    questions: 0,
    correct: 0,
    time: 0
  });

  useEffect(() => {
    if (!user) return;
    const subQuery = query(collection(db, 'users', user.uid, 'subjects'), orderBy('createdAt', 'desc'));
    const topicQuery = query(collection(db, 'users', user.uid, 'topics'), orderBy('createdAt', 'desc'));
    const sessionQuery = query(collection(db, 'users', user.uid, 'studySessions'), orderBy('date', 'desc'));

    const unsubSubs = onSnapshot(subQuery, (snap) => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject)));
    });
    const unsubTopics = onSnapshot(topicQuery, (snap) => {
      setTopics(snap.docs.map(d => ({ id: d.id, ...d.data() } as Topic)));
    });
    const unsubSessions = onSnapshot(sessionQuery, (snap) => {
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudySession)));
      setLoading(false);
    });

    return () => {
      unsubSubs();
      unsubTopics();
      unsubSessions();
    };
  }, [user?.uid]);

  const addSubject = async () => {
    if (!user || !newSubjectName.trim()) return;
    await addDoc(collection(db, 'users', user.uid, 'subjects'), {
      name: newSubjectName,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      icon: 'book',
      createdAt: new Date().toISOString()
    });
    setNewSubjectName('');
    setShowAddSubject(false);
  };

  const addTopic = async () => {
    if (!user || !newTopicName.trim() || !selectedSubject) return;
    await addDoc(collection(db, 'users', user.uid, 'topics'), {
      name: newTopicName,
      subjectId: selectedSubject.id,
      interval: 0,
      easinessFactor: 2.5,
      repetitions: 0,
      createdAt: new Date().toISOString()
    });
    setNewTopicName('');
  };

  const deleteSubject = async (id: string) => {
    if (!user) return;
    if (confirm('Deseja excluir esta matéria e todos os seus tópicos?')) {
      await deleteDoc(doc(db, 'users', user.uid, 'subjects', id));
      // Topics and sessions should ideally be cleaned up too, but for simplicity we'll leave them or filter them in UI
    }
  };

  const submitSession = async () => {
    if (!user || !showSessionForm) return;
    
    const topic = showSessionForm;
    const quality = accuracyToQuality(sessionData.correct, sessionData.questions);
    const srsUpdate = calculateNextReview(
      quality, 
      topic.repetitions, 
      topic.interval, 
      topic.easinessFactor
    );

    // Add session
    await addDoc(collection(db, 'users', user.uid, 'studySessions'), {
      topicId: topic.id,
      subjectId: topic.subjectId,
      date: new Date().toISOString(),
      questionsCount: sessionData.questions,
      correctCount: sessionData.correct,
      studyTimeMinutes: sessionData.time
    });

    // Update topic
    await updateDoc(doc(db, 'users', user.uid, 'topics', topic.id), {
      ...srsUpdate,
      lastReviewDate: new Date().toISOString()
    });

    setShowSessionForm(null);
    setSessionData({ questions: 0, correct: 0, time: 0 });
  };

  if (loading) return <div className="font-mono text-xs opacity-50">CARREGANDO MATÉRIAS...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar: Subjects */}
      <div className="lg:col-span-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest">Suas Matérias</h3>
          <button 
            onClick={() => setShowAddSubject(!showAddSubject)}
            className="p-1 hover:bg-[#141414] hover:text-[#E4E3E0] transition-all border border-[#141414]"
          >
            <Plus size={16} />
          </button>
        </div>

        {showAddSubject && (
          <div className="p-4 bg-white border border-[#141414] mb-4">
            <input 
              type="text" 
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="Nome da Matéria"
              className="w-full p-2 font-mono text-xs border border-[#141414] mb-2 focus:outline-none"
            />
            <button 
              onClick={addSubject}
              className="w-full bg-[#141414] text-[#E4E3E0] py-2 font-mono text-[10px] uppercase"
            >
              ADICIONAR
            </button>
          </div>
        )}

        <div className="space-y-2">
          {subjects.map(sub => (
            <div 
              key={sub.id}
              onClick={() => setSelectedSubject(sub)}
              className={cn(
                "group flex items-center justify-between p-4 border border-[#141414] cursor-pointer transition-all",
                selectedSubject?.id === sub.id ? "bg-[#141414] text-[#E4E3E0]" : "bg-white hover:bg-[#141414]/5"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2" style={{ backgroundColor: sub.color }}></div>
                <span className="font-serif italic text-sm">{sub.name}</span>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteSubject(sub.id); }}
                  className="p-1 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
                <ChevronRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main: Topics & Details */}
      <div className="lg:col-span-8">
        {selectedSubject ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif italic text-3xl">{selectedSubject.name}</h2>
                <p className="text-[10px] font-mono opacity-50 uppercase mt-1">
                  {topics.filter(t => t.subjectId === selectedSubject.id).length} Tópicos Registrados
                </p>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Novo Tópico..."
                  className="p-2 font-mono text-xs border border-[#141414] focus:outline-none bg-white"
                />
                <button 
                  onClick={addTopic}
                  className="bg-[#141414] text-[#E4E3E0] px-4 font-mono text-[10px] uppercase"
                >
                  ADICIONAR
                </button>
              </div>
            </div>

            {/* Topics List */}
            <div className="space-y-4">
              {topics.filter(t => t.subjectId === selectedSubject.id).map(topic => (
                <div key={topic.id} className="bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h4 className="font-serif italic text-xl">{topic.name}</h4>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-1 text-[10px] font-mono opacity-50">
                          <History size={12} />
                          <span>REVISÕES: {topic.repetitions}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono opacity-50">
                          <CalendarIcon size={12} />
                          <span>PRÓXIMA: {topic.nextReviewDate ? format(parseISO(topic.nextReviewDate), 'dd/MM/yyyy') : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowSessionForm(topic)}
                      className="bg-[#141414] text-[#E4E3E0] px-4 py-2 font-mono text-[10px] uppercase hover:bg-[#141414]/90"
                    >
                      REGISTRAR ESTUDO
                    </button>
                  </div>

                  {/* Topic History Mini Dashboard */}
                  <div className="grid grid-cols-4 gap-4 border-t border-[#141414]/10 pt-4">
                    <TopicStat 
                      label="ACERTOS" 
                      value={sessions.filter(s => s.topicId === topic.id).reduce((acc, s) => acc + s.correctCount, 0)} 
                      icon={<CheckCircle size={12} />}
                    />
                    <TopicStat 
                      label="QUESTÕES" 
                      value={sessions.filter(s => s.topicId === topic.id).reduce((acc, s) => acc + s.questionsCount, 0)} 
                      icon={<BarChart2 size={12} />}
                    />
                    <TopicStat 
                      label="TEMPO" 
                      value={`${sessions.filter(s => s.topicId === topic.id).reduce((acc, s) => acc + s.studyTimeMinutes, 0)}m`} 
                      icon={<Clock size={12} />}
                    />
                    <TopicStat 
                      label="PRECISÃO" 
                      value={`${(() => {
                        const topicSessions = sessions.filter(s => s.topicId === topic.id);
                        const totalQuestions = topicSessions.reduce((acc, s) => acc + s.questionsCount, 0);
                        const totalCorrect = topicSessions.reduce((acc, s) => acc + s.correctCount, 0);
                        return totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(0) : 0;
                      })()}%`} 
                      icon={<Target size={12} />}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center border border-dashed border-[#141414]/20 p-20 text-center">
            <BookOpen size={48} className="opacity-10 mb-4" />
            <p className="font-serif italic text-xl opacity-40">Selecione uma matéria para ver os tópicos</p>
          </div>
        )}
      </div>

      {/* Session Entry Modal */}
      {showSessionForm && (
        <div className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#141414] p-8 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
            <h3 className="font-serif italic text-2xl mb-2">Registrar Estudo</h3>
            <p className="text-[10px] font-mono opacity-50 uppercase mb-6">{showSessionForm.name}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase mb-1">Total de Questões</label>
                <input 
                  type="number" 
                  value={sessionData.questions}
                  onChange={(e) => setSessionData({...sessionData, questions: parseInt(e.target.value) || 0})}
                  className="w-full p-2 border border-[#141414] font-mono text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase mb-1">Quantidade de Acertos</label>
                <input 
                  type="number" 
                  value={sessionData.correct}
                  onChange={(e) => setSessionData({...sessionData, correct: parseInt(e.target.value) || 0})}
                  className="w-full p-2 border border-[#141414] font-mono text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase mb-1">Tempo Estudado (minutos)</label>
                <input 
                  type="number" 
                  value={sessionData.time}
                  onChange={(e) => setSessionData({...sessionData, time: parseInt(e.target.value) || 0})}
                  className="w-full p-2 border border-[#141414] font-mono text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setShowSessionForm(null)}
                className="flex-1 border border-[#141414] py-3 font-mono text-[10px] uppercase hover:bg-[#141414]/5"
              >
                CANCELAR
              </button>
              <button 
                onClick={submitSession}
                className="flex-1 bg-[#141414] text-[#E4E3E0] py-3 font-mono text-[10px] uppercase hover:bg-[#141414]/90"
              >
                SALVAR SESSÃO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TopicStat({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 opacity-40 mb-1">
        {icon}
        <span className="text-[8px] font-mono uppercase">{label}</span>
      </div>
      <span className="text-xs font-mono font-bold">{value}</span>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

function CalendarIcon({ size }: { size: number }) {
  return <CalendarIconLucide size={size} />;
}
import { Calendar as CalendarIconLucide } from 'lucide-react';
import { Target } from 'lucide-react';
