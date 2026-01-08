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

  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000';

  useEffect(() => {
    const s = io(API_ORIGIN);
    setSocket(s);
    s.emit('subscribe_global_leaderboard');
    s.on('global_leaderboard_snapshot', (payload: Row[]) => {
      setRows(payload || []);
      setLoading(false);
    });
    // initial fetch
    (async () => {
      try {
        const res = await fetch(`${API_ORIGIN}/api/answers/leaderboard-global`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success) setRows(data.leaderboard || []);
      } catch {}
      setLoading(false);
    })();
    return () => { s.disconnect(); };
  }, [token]);

  const styles = {
    page: { backgroundColor: '#000' },
    toolbar: { backgroundColor: '#000', color: '#fff' },
    title: { color: '#fff', border: "1px solid #000", textAlign: 'center', padding: 10 },
    content: { backgroundColor: '#000', color: '#fff' },
    card: { backgroundColor: '#121212', color: '#fff', border: '1px solid #333' },
    row: { display: 'flex', justifyContent: 'space-between' },
    left: { color: '#fff' },
    right: { color: '#fff', fontWeight: 600 },
  };

  return (
    <IonPage style={styles.page}>
      <div style={styles.content}>
        <IonTitle style={styles.title}>Global Leaderboard</IonTitle>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: 24 }}><IonSpinner /></div>
        ) : (
          <IonCard style={styles.card}>
            <IonCardHeader>
              <IonCardTitle style={{color: 'white', textAlign: 'center'}}>Top Scores Across All Rooms</IonCardTitle>
            </IonCardHeader>
            <div style={{background: '#000'}}>
              <IonList style={{background: '#000'}}>
                {rows.map((r) => (
                  <div style={{background: (user && r.userId === (user as any).id) ? '#2f2f2f' : '#000', padding: 8, borderRadius: 8}} key={r.userId} >
                    <IonLabel>
                      <div style={styles.row as React.CSSProperties}>
                        <span style={{ ...styles.left, fontWeight: (user && r.userId === (user as any).id) ? 700 : 400 }}>{(r.position === 1 ? '🥇' : r.position === 2 ? '🥈' : r.position === 3 ? '🥉' : `${r.position}.`)} {r.username}</span>
                        <span style={{ ...styles.right, color: (user && r.userId === (user as any).id) ? '#D1D5DB' : '#fff' }}>{r.score}</span>
                      </div>
                      {/* <div className="text-xs text-gray-500 mt-1">
                        <IonBadge color="tertiary" className="mr-2">Correct: {r.correct}</IonBadge>
                        <IonBadge color="medium" className="mr-2">Answered: {r.answered}</IonBadge>
                        <IonBadge color="success">Rooms: {r.rooms}</IonBadge>
                      </div> */}
                    </IonLabel>
                  </div>
                ))}
              </IonList>
            </div>
          </IonCard>
        )}
      </div>
    </IonPage>
  );
};

export default GlobalLeaderboard;
