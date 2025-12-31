import React, { useEffect, useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonSpinner, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';

interface Question {
  id: number;
  question_text?: string;
  questionText?: string;
  options?: string[] | string;
  correct_answer_index?: number;
  correctAnswerIndex?: number;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
}

const QuizGame: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const history = useHistory();
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const lastIndexRef = React.useRef<number | null>(null);

  useEffect(() => {
    // Initialize Socket
    const newSocket = io('https://preprimary-chau-unmelodised.ngrok-free.dev');
    setSocket(newSocket);

    newSocket.emit('join_game', { roomId: id, userId: user?.id });

    newSocket.on('game_state', (state: any) => {
        setLoading(false);
        if (state.finished) {
            setIsFinished(true);
            setSelectedOptionIndex(null);
        } else {
            let q = state.question;
            if (q && typeof q.options === 'string') {
              try { q = { ...q, options: JSON.parse(q.options) }; } catch {}
            }
            setQuestion(q);
            setTimeLeft(state.timeLeft);
            setTotalQuestions(state.total);
            const isNewQuestion = lastIndexRef.current === null || lastIndexRef.current !== state.index;
            setCurrentQuestionIndex(state.index);
            if (isNewQuestion) {
              setSelectedOptionIndex(null);
            }
            lastIndexRef.current = state.index;
        }
    });

    newSocket.on('error', (err: any) => {
        console.error("Socket error:", err);
        setLoading(false);
    });

    return () => {
        newSocket.disconnect();
    };
  }, [id, user]);

  if (loading) {
      return (
          <IonPage>
              <IonContent className="ion-padding text-center">
                  <IonSpinner />
                  <p>Syncing game state...</p>
              </IonContent>
          </IonPage>
      );
  }

  if (isFinished) {
      return (
          <IonPage>
              <IonHeader><IonToolbar><IonTitle>Quiz Finished</IonTitle></IonToolbar></IonHeader>
              <IonContent className="ion-padding text-center">
                  <h2>The Quiz has ended!</h2>
                  <IonButton routerLink="/dashboard">Go to Dashboard</IonButton>
              </IonContent>
          </IonPage>
      );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Question {currentQuestionIndex + 1} / {totalQuestions}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {question && (
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
                        <IonCardTitle>{question.question_text || question.questionText}</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent className="space-y-2">
                        {(() => {
                          const opts: string[] = Array.isArray(question.options)
                            ? question.options as string[]
                            : ['a','b','c','d']
                                .map((k) => (question as any)[`option_${k}`])
                                .filter((v: any) => typeof v === 'string');
                          const correctIndex: number = typeof question.correct_answer_index === 'number'
                            ? (question.correct_answer_index as number)
                            : (typeof question.correctAnswerIndex === 'number' ? (question.correctAnswerIndex as number) : -1);

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
                                  localStorage.setItem(`quiz_progress_${id}_${currentQuestionIndex}`, String(i));
                                  try {
                                    fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/answers/submit`, {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                      },
                                      body: JSON.stringify({ roomId: id, questionId: (question as any).id, selectedIndex: i })
                                    });
                                  } catch {}
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
      </IonContent>
    </IonPage>
  );
};

export default QuizGame;
