import React, { useState, useEffect, useRef } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonList, IonItem, IonLabel, IonSpinner, IonButtons, IonButton, IonAlert, IonToast,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import QuizGame from './QuizGame';

interface Participant {
  id: number;
  username: string;
  joined_at: string;
}

// Separate component for Countdown
const CountdownDisplay = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference > 0) {
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        
        if (hours > 0) setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        else setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft("Starting...");
      }
    };
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return <p className="text-xl font-bold text-blue-600 mt-2">{timeLeft}</p>;
};

const Leaderboard = ({ roomId, token }: { roomId: string, token: string | null }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/answers/leaderboard/${roomId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success) setRows(data.leaderboard);
      } catch {}
    };
    run();
  }, [roomId, token]);
  return (
    <div className="mt-6 max-w-md mx-auto text-left">
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Leaderboard (Points)</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonList>
            {rows.map((r, idx) => (
              <IonItem key={r.user_id} color={user && r.user_id === user.id ? 'light' : undefined}>
                <IonLabel>
                  <div className="flex justify-between">
                    <span>{idx + 1}. {r.username}</span>
                    <span className="font-semibold">{r.score}</span>
                  </div>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        </IonCardContent>
      </IonCard>
    </div>
  );
};

const RoomLobby: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const history = useHistory();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [question, setQuestion] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const lastIndexRef = useRef<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const questionStartRef = useRef<number | null>(null);
  

  useEffect(() => {
    fetchRoomDetails();
    fetchParticipants();
    const interval = setInterval(() => {
      fetchParticipants();
    }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (!isPublic) {
      const s = io('https://preprimary-chau-unmelodised.ngrok-free.dev');
      setSocket(s);
      s.emit('join_room', id);
      s.emit('join_game', { roomId: id });

      s.on('game_state', (state: any) => {
        if (state.finished) {
          setIsFinished(true);
          setQuestion(null);
          setSelectedOptionIndex(null);
          return;
        }
        if (state.error) {
          setQuestion(null);
          setSelectedOptionIndex(null);
          return;
        }
        let q = state.question;
        if (q && typeof q.options === 'string') {
          try { q = { ...q, options: JSON.parse(q.options) }; } catch {}
        }
        setQuestion(q);
        setTimeLeft(state.timeLeft);
        setTotalQuestions(state.total);
        const isNewQuestion = lastIndexRef.current === null || lastIndexRef.current !== state.index;
        setCurrentIndex(state.index);
        if (isNewQuestion) {
          setSelectedOptionIndex(null);
        }
        lastIndexRef.current = state.index;
      });

      return () => {
        s.disconnect();
      };
    }
  }, [id, isPublic]);

  // Client no longer compares times; relies on server broadcast

  const fetchRoomDetails = async () => {
    try {
      const res = await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/rooms/${id}/info`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setIsPublic(!!data.room.is_public);
        setTotalQuestions(data.total || 0);
        if (data.room.is_public) {
          try {
            await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/rooms/join/${id}`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            });
          } catch {}
          if (data.completed) {
            setIsFinished(true);
          } else {
            await loadNextPublicQuestion();
          }
        } else {
          const localIso = data.room.start_time ? String(data.room.start_time).replace(' ', 'T') : null;
          setStartTime(localIso);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!startTime) {
        try {
          const stored = localStorage.getItem(`room_start_time_${id}`);
          if (stored) {
            const localIso = stored.includes('T') ? stored : stored.replace(' ', 'T');
            setStartTime(localIso);
          }
        } catch {}
      }
    }
  };

  const loadNextPublicQuestion = async () => {
    try {
      const [qRes, aRes] = await Promise.all([
        fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/questions/room/${id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/answers/my/${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const qData = await qRes.json();
      const aData = await aRes.json();
      if (!qData.success) return;
      const questions = qData.questions || [];
      const answeredIds = new Set((aData.answers || []).map((r: any) => r.question_id));
      const nextIndex = questions.findIndex((q: any) => !answeredIds.has(q.id));
      if (nextIndex === -1) {
        setIsFinished(true);
        setQuestion(null);
        return;
      }
      const q = questions[nextIndex];
      setQuestion(q);
      setCurrentIndex(nextIndex);
      setSelectedOptionIndex(null);
      const tpq = typeof q.time_per_question === 'number' ? q.time_per_question : undefined;
      const roomTpq = undefined; // rely on server value
      const sec = roomTpq ||  (typeof (q as any).time_per_question === 'number' ? (q as any).time_per_question : 30);
      setTimeLeft(sec);
      questionStartRef.current = Date.now();
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          const nxt = Math.max(0, prev - 1);
          if (nxt === 0) clearInterval(interval);
          return nxt;
        });
      }, 1000);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchParticipants = async () => {
    try {
      const res = await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/rooms/${id}/participants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setParticipants(data.participants);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    try {
      await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/rooms/leave/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error(err);
    }
    // Navigate away regardless of success to ensure UI responsiveness
    history.push('/home');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton onClick={() => setShowAlert(true)}>Leave</IonButton></IonButtons>
          <IonTitle>Room Lobby</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {isFinished ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold">Quiz Finished</h2>
            <Leaderboard roomId={id} token={token} />
          </div>
        ) : !question ? (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Waiting for Host...</h2>
              {startTime ? (
                <div>
                  <p className="text-gray-500">The quiz will start in:</p>
                  <CountdownDisplay targetDate={startTime} />
                </div>
              ) : (
                <p className="text-gray-500">The quiz will start soon.</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-2">Participants ({participants.length})</h3>
              {loading ? (
                 <div className="text-center"><IonSpinner /></div>
              ) : (
                <div className="h-64 overflow-y-auto border rounded">
                  <IonList>
                    {participants.map(p => (
                      <IonItem key={p.id}>
                        <IonLabel>
                          <h2>{p.username}</h2>
                          <p className="text-xs text-gray-400">Joined: {new Date(p.joined_at).toLocaleTimeString()}</p>
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="max-w-md mx-auto mt-4">
            <div className="text-center mb-4">
              <span className="text-2xl font-bold text-blue-600">{timeLeft}s</span>
            </div>
            <IonCard>
              <IonCardHeader>
                {(question as any).image_url || (question as any).imageUrl ? (
                  <img
                    src={(() => {
                      const raw = (question as any).image_url || (question as any).imageUrl;
                      return typeof raw === 'string' && raw.startsWith('/uploads') ? `https://preprimary-chau-unmelodised.ngrok-free.dev${raw}` : raw;
                    })()}
                    alt="Question"
                    className="mb-3 max-h-60 object-contain border rounded"
                  />
                ) : null}
                <IonCardTitle>{question.question_text || (question as any).questionText}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent className="space-y-2">
                {(() => {
                  const opts: string[] = Array.isArray((question as any).options)
                    ? ((question as any).options as string[])
                    : ['a','b','c','d']
                        .map((k) => (question as any)[`option_${k}`])
                        .filter((v: any) => typeof v === 'string');
                  const correctIndex: number = typeof (question as any).correct_answer_index === 'number'
                    ? ((question as any).correct_answer_index as number)
                    : (typeof (question as any).correctAnswerIndex === 'number' ? ((question as any).correctAnswerIndex as number) : -1);

                  return opts.map((text, i) => {
                    const isSelected = selectedOptionIndex === i;
                    const hasSelection = selectedOptionIndex !== null;
                    const isCorrect = i === correctIndex;
                    const color = hasSelection ? (isCorrect ? 'success' : isSelected ? 'danger' : undefined) : 'medium';
                    const fill = hasSelection ? (isCorrect || isSelected ? 'solid' : 'outline') : 'outline';

                    return (
                      <IonButton
                        key={i}
                        expand="block"
                        color={color as any}
                        fill={fill as any}
                        disabled={selectedOptionIndex !== null}
                        onClick={() => {
                          if (selectedOptionIndex !== null) return;
                          setSelectedOptionIndex(i);
                          localStorage.setItem(`quiz_progress_${id}_${currentIndex}`, String(i));
                          (async () => {
                            try {
                              const res = await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/answers/submit`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ 
                                  roomId: id, 
                                  questionId: (question as any).id, 
                                  selectedIndex: i, 
                                  elapsedMs: isPublic && questionStartRef.current ? (Date.now() - questionStartRef.current) : undefined
                                })
                              });
                              const data = await res.json();
                              if (!data?.success) setSubmitError(data?.message || 'Failed to save answer');
                              if (isPublic) {
                                setTimeout(() => {
                                  loadNextPublicQuestion();
                                }, 800);
                              }
                            } catch (e: any) {
                              setSubmitError('Network error while saving answer');
                            }
                          })();
                        }}
                      >
                        {text}
                      </IonButton>
                    );
                  });
                })()}
              </IonCardContent>
            </IonCard>
          </div>
        )}

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={'Leave Room'}
          message={'Are you sure you want to leave this room?'}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => setShowAlert(false)
            },
            {
              text: 'Leave',
              role: 'destructive',
              handler: handleLeave
            }
          ]}
        />
        <IonToast 
          isOpen={!!submitError} 
          onDidDismiss={() => setSubmitError(null)} 
          message={submitError || ''} 
          duration={2000} 
        />
      </IonContent>
    </IonPage>
  );
};

export default RoomLobby;
