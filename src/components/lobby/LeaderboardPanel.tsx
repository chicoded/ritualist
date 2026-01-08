import React, { useEffect, useState } from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel } from '@ionic/react';

const LeaderboardPanel = ({ roomId, token, currentUserId }: { roomId: string; token: string | null; currentUserId?: number }) => {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/answers/leaderboard/${roomId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success) setRows(data.leaderboard);
      } catch {}
    };
    run();
  }, [roomId, token]);
  return (
    <div style={{background: '#000'}} className="mt-6 max-w-md mx-auto text-left">
      <IonCard>
        <IonCardHeader>
          <IonCardTitle> 🏆 Leaderboard (Points)</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonList>
            {rows.map((r: any, idx: number) => (
              <IonItem key={r.user_id} color={currentUserId && r.user_id === currentUserId ? 'light' : undefined}>
                <IonLabel>
                  <div className="flex justify-between">
                    <span>{(idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`)} {r.username}</span>
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

export default LeaderboardPanel;
