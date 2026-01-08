import React, { useState, useEffect } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonSpinner, IonIcon, IonFab, IonFabButton, IonButtons, IonAvatar, IonToast
} from '@ionic/react';
import { add } from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import { useHistory } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';

interface Room {
  id: number;
  room_code: string;
  title: string;
  max_participants: number;
  status: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000';
  const { token, user } = useAuth();
  const history = useHistory();
  const [myScore, setMyScore] = useState<{ total: number; correct: number; answered: number }>({ total: 0, correct: 0, answered: 0 });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  const styles = {
    page: { backgroundColor: '#000', height: '100vh' },
    toolbar: { backgroundColor: '#000', color: '#fff' },
    title: { color: '#fff' },
    headerRight: { border: '1px solid white', padding: 0, color: 'white', background: '#424242ff', borderRadius: 30, fontSize: 12 },
    content: { backgroundColor: '#000', color: '#fff' },
    container: { margin: '0 auto', padding: 16, color: '#fff' },
    grid: { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' },
    card: { backgroundColor: '#121212', color: '#fff', border: '1px solid #bcbcbcff' },
    subtitle: { fontSize: 12, color: '#9CA3AF' },
    info: { fontSize: 12, color: '#9CA3AF' },
    avatar: { width: 32, height: 32 },
  };

  useEffect(() => {
    fetchMyRooms();
    fetchMyScore();
    const s = io(API_ORIGIN);
    setSocket(s);
    s.emit('subscribe_rooms');
    s.on('rooms_snapshot', (snapshot: any[]) => {
      setRooms(prev => {
        // Only update rooms that belong to current user
        const byId = new Map(prev.map(r => [r.id, r]));
        snapshot.forEach(r => {
          const existing = byId.get(r.id);
          if (existing) {
            byId.set(r.id, {
              ...existing,
              title: r.title,
              status: r.status,
              max_participants: existing.max_participants,
            });
          }
        });
        return Array.from(byId.values());
      });
    });
    return () => { s.disconnect(); };
  }, []);

  const fetchMyRooms = async () => {
    try {
      const response = await fetch(`${API_ORIGIN}/api/rooms/my-rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyScore = async () => {
    try {
      const res = await fetch(`${API_ORIGIN}/api/users/me/score`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMyScore({ total: data.total_score || 0, correct: data.correct || 0, answered: data.answered || 0 });
      }
    } catch (e) {}
  };

  const deleteRoom = async (id: number) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    try {
      await fetch(`${API_ORIGIN}/api/rooms/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchMyRooms();
    } catch {}
  };

  const copyInvite = async (roomId: number) => {
    try {
      const url = `${window.location.origin}/lobby/${roomId}`;
      await navigator.clipboard.writeText(url);
      setToast({ show: true, message: 'Invite link copied to clipboard' });
    } catch {
      setToast({ show: true, message: 'Failed to copy link' });
    }
  };

  return (
    <IonPage>
      <div style={styles.page}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
          {/* {user && ( */}
            // <IonButtons slot="start">
            //   <IonAvatar style={styles.avatar}>
            //     {/* <img src={user.avatar_url || `https://avatar.iran.liara.run/public?seed=${encodeURIComponent(user.username)}`} alt="avatar" /> */}
            //   </IonAvatar>
            // </IonButtons>
          {/* // )} */}
          <div style={styles.title}>My Quiz Rooms</div>
          {user && (
            <IonButton routerLink="/create-room" fill="clear" style={styles.headerRight}> + Create Quiz</IonButton>
          )}
        </div>
      
        <div style={styles.container}>
          {loading ? (
            <div style={{ textAlign: 'center', marginTop: 24 }}><IonSpinner /></div>
          ) : rooms.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <p style={{ color: '#9CA3AF', marginBottom: 12 }}>You haven't created any rooms yet.</p>
              <IonButton routerLink="/create-room">Create First Room</IonButton>
            </div>
          ) : (
            <div style={styles.grid as React.CSSProperties}>
              {rooms.map(room => (
                <IonCard key={room.id} style={styles.card}>
                  <IonCardHeader>
                    <IonCardTitle style={{color: 'white'}}>{room.title}</IonCardTitle>
                    <IonCardSubtitle style={styles.subtitle}>Code: {room.room_code}</IonCardSubtitle>
                  </IonCardHeader>
                  <div style={{ padding: '0 12px 12px' }}>
                    <p style={styles.info}>Status: {room.status}</p>
                    <p style={styles.info}>Participants: {room.max_participants}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <IonButton size="small" onClick={() => history.push(`/room/edit/${room.id}`)}>Edit</IonButton>
                      <IonButton size="small" fill="outline" onClick={() => copyInvite(room.id)}>Copy Invite Link</IonButton>
                    </div>
                  </div>
                </IonCard>
              ))}
            </div>
          )}
        </div>

      
        <IonToast isOpen={toast.show} onDidDismiss={() => setToast({ ...toast, show: false })} message={toast.message} duration={1500} />
      </div>
    </IonPage>
  );
};

export default Dashboard;
