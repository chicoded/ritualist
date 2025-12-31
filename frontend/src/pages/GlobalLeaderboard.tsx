import React, { useEffect, useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonBadge, IonSpinner } from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';

interface Row {
  userId: number;
  username: string;
  score: number;
  correct: number;
  answered: number;
  rooms: number;
  position: number;
}

const GlobalLeaderboard: React.FC = () => {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io('https://preprimary-chau-unmelodised.ngrok-free.dev');
    setSocket(s);
    s.emit('subscribe_global_leaderboard');
    s.on('global_leaderboard_snapshot', (payload: Row[]) => {
      setRows(payload || []);
      setLoading(false);
    });
    // initial fetch
    (async () => {
      try {
        const res = await fetch('https://preprimary-chau-unmelodised.ngrok-free.dev/api/answers/leaderboard-global', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success) setRows(data.leaderboard || []);
      } catch {}
      setLoading(false);
    })();
    return () => { s.disconnect(); };
  }, [token]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Global Leaderboard</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {loading ? (
          <div className="flex justify-center mt-10"><IonSpinner /></div>
        ) : (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Top Scores Across All Rooms</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                {rows.map((r) => (
                  <IonItem key={r.userId} color={user && r.userId === user.id ? 'light' : undefined}>
                    <IonLabel>
                      <div className="flex justify-between">
                        <span>{r.position}. {r.username}</span>
                        <span className="font-semibold">{r.score}</span>
                      </div>
                      {/* <div className="text-xs text-gray-500 mt-1">
                        <IonBadge color="tertiary" className="mr-2">Correct: {r.correct}</IonBadge>
                        <IonBadge color="medium" className="mr-2">Answered: {r.answered}</IonBadge>
                        <IonBadge color="success">Rooms: {r.rooms}</IonBadge>
                      </div> */}
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default GlobalLeaderboard;
