import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonModal, IonItem, IonLabel, IonInput, IonToast, IonLoading, IonButtons, IonAvatar } from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useHistory } from 'react-router-dom';
import { useRef } from 'react';
import LoginModal from '@/components/LoginModal';
import PublicRoomSlider from '@/components/PublicRoomSlider';
import LeaderboardCarousel from '@/components/LeaderboardCarousel';
import FloatingNav from '@/components/FloatingNav';
import Ritual from '@/assets/imgs/ritualLogoBg.png';


const Home: React.FC = () => {
  const { user, logout, token, login } = useAuth();
  const history = useHistory();
  const [recent, setRecent] = useState<Array<{ id: number; title: string; participant_count: number; published_at?: string; cover_photo_url?: string }>>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [targetRoom, setTargetRoom] = useState<number | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const styles = {
    page: { backgroundColor: '#000', height: "100vh", paddingBottom: 90, paddingTop: 16, overflowY: "auto" as const},
    headerBar: { backgroundColor: '#000', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
    avatar: { width: 35, height: 35 },
    welcomeInline: { fontSize: 14, marginBottom: 0, marginLeft: 8, },
    contentWrap: { backgroundColor: '#000', color: '#fff' },
    container: { margin: '0 auto', padding: 16, textAlign: 'center' as const, color: '#fff', background: "#000"},
    section: { marginTop: 0, textAlign: 'left' as const },
    sectionTitle: { fontSize: 18, fontWeight: 600 as const, marginBottom: 8, color: '#fff' },
    rail: { display: 'flex', gap: 8, overflowX: 'auto' as const, paddingBottom: 8, paddingLeft: 8, paddingRight: 8, scrollSnapType: 'x mandatory' as any },
    card: { margin: 0, minWidth: '80%', height: 280, scrollSnapAlign: 'center', transition: 'transform 300ms ease-out, opacity 300ms ease-out', backgroundColor: '#121212', color: '#fff', border: '1px solid #333' },
    cardTitle: { fontSize: 16, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' },
    meta: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
    metaSpacer: { marginLeft: 8 },
    noItems: { fontSize: 14, color: '#9CA3AF' },
    playCard: { borderBottom: ".2px solid #ccc", display: 'flex', justifyContent: 'space-between', padding: 10 }
  };
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_ORIGIN}/api/rooms`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
        const data = await res.json();
        if (data.success) setRecent(data.rooms || []);
      } catch {}
      finally { setRecentLoading(false); }
    })();
  }, [token]);

  useEffect(() => {
    const s = io(API_ORIGIN);
    setSocket(s);
    s.emit('subscribe_rooms');
    s.on('rooms_snapshot', (snapshot: any[]) => {
      setRecent((prev) => {
        const map = new Map<number, any>();
        prev.forEach(r => map.set(r.id, r));
        snapshot.forEach(r => {
          const existing = map.get(r.id);
          map.set(r.id, {
            id: r.id,
            title: r.title,
            participant_count: r.participantCount,
            // preserve cover and published time
            cover_photo_url: (r.coverPhotoUrl ?? existing?.cover_photo_url),
            published_at: existing?.published_at,
            is_public: existing?.is_public,
            host_id: existing?.host_id,
          });
        });
        return Array.from(map.values());
      });
    });
    return () => { s.disconnect(); };
  }, []);

  useEffect(() => {}, [railRef, recent]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_ORIGIN}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.success) {
        login(data.token, data.user);
        setShowLogin(false);
        if (targetRoom) history.push(`/lobby/${targetRoom}`);
      } else {
        setToast({ show: true, message: data.message || 'Login failed' });
      }
    } catch {
      setToast({ show: true, message: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<{ id: number; is_public?: number | boolean; host_id?: number } | null>(null);

  const onJoinRoom = async (room: { id: number; is_public?: number | boolean; host_id?: number }) => {
    if (!user) {
      setTargetRoom(room.id);
      setShowLogin(true);
      return;
    }
    if (room.host_id && user.id === room.host_id) {
      setToast({ show: true, message: 'You cannot participate in a room you created' });
      return;
    }
    const isPublic = room.is_public === 1 || room.is_public === true;
    if (isPublic) {
      try {
        await fetch(`${API_ORIGIN}/api/rooms/join/${room.id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      } catch {}
      history.push(`/lobby/${room.id}`);
    } else {
      setSelectedRoom(room);
      setShowPassword(true);
    }
  };

  const viewStats = (roomId: number) => {
    history.push(`/lobby/${roomId}`);
  };

  const [myScore, setMyScore] = useState<{ total: number; correct: number; answered: number }>({ total: 0, correct: 0, answered: 0 });
  const [recentPlayed, setRecentPlayed] = useState<Array<{ id: number; title: string; room_code?: string; last_played: string; answered: number; total_score: number }>>([]);
  const [recentPlayedLoading, setRecentPlayedLoading] = useState(true);
  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000';
  const resolveAvatar = (avatar?: string) => {
    if (!avatar) return Ritual;
    if (avatar.startsWith('http')) return avatar;
    if (avatar.startsWith('/')) return `${API_ORIGIN}${avatar}`;
    return `${API_ORIGIN}/${avatar}`;
  };
  
    useEffect(() => {
      if (token) {
        fetchMyScore();
        fetchRecentPlayed();
      }
    }, [token]);

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

  const fetchRecentPlayed = async () => {
    try {
      const res = await fetch(`${API_ORIGIN}/api/users/me/recent-played`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setRecentPlayed(data.recent || []);
    } catch (e) {}
    finally { setRecentPlayedLoading(false); }
  };


  return (
    <IonPage >
      <div style={styles.page}>
      <div style={styles.headerBar}> 
        {/* <IonToolbar style={{"--backgroundColor": "red"}} mode='ios'> */}
          {user && (
            <IonButtons slot="start">
              <IonAvatar style={{ ...styles.avatar, cursor: 'pointer' }} onClick={() => history.push('/profile')}>
                <img
                  src={resolveAvatar(user?.avatar_url)}
                  alt="avatar"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = Ritual; }}
                />
              </IonAvatar>
              <p style={styles.welcomeInline}>Welcome, <br /> <span style={{fontSize: 16, fontWeight: 500}}>{user?.username || "Guest"}!</span></p>
            </IonButtons>
          )}

          <IonButton
            slot="end"
            fill="clear"
            style={{ border: '1px solid white', padding: 0, color: 'white', background: '#424242ff', borderRadius: 30 }}
            onClick={user ? undefined : () => setShowLogin(true)}
            disabled={!!user}
          >
            {user ? `Score: ${myScore.total}` : 'Login'}
          </IonButton>
        {/* </IonToolbar> */}
      </div>
      <div style={{border: "0px solid white", width: "95%", margin: "auto"}}>
          <LeaderboardCarousel overlay={false} />
      </div>
      <div style={{...styles.container, border: "0px solid white"}}>
              <div style={{fontSize: 28, margin: "auto", border: "0px solid white", fontWeight: 600, textAlign: "left", width: "95%", marginBottom: 8,}}>Popular Games</div>
          {recentLoading ? (
            <div style={{ textAlign: 'center', marginTop: 12 }}><span>Loading rooms...</span></div>
          ) : (
            <PublicRoomSlider rooms={recent} isAuthenticated={!!user} onJoin={onJoinRoom} participatedIds={recentPlayed.map(r => r.id)} />
          )}
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginLeft: 16, marginBottom: 8 }}>Recent Played</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 16, paddingRight: 16 }}>
          {recentPlayedLoading ? (
            <div style={{ textAlign: 'center', marginTop: 12 }}><span>Loading recent played...</span></div>
          ) : recentPlayed.map((r) => (
            <div key={r.id} style={{ ...styles.playCard, width: '100%' }}>
              <div>
                <div style={styles.cardTitle}>{r.title}</div>
                {/* <div style={styles.meta}>Last: {new Date(r.last_played).toLocaleString()}</div> */}
                <div style={styles.meta}>Point Earned: {r.total_score}</div>
              </div>

              <div style={{ marginTop: 8 }}>
                <button style={{background: "#ffffff3a", padding: 4, borderRadius: 5, color: "yellow"}} onClick={() => viewStats(r.id)}>View Stats</button>
              </div>
            </div>
          ))}
          {!recentPlayedLoading && recentPlayed.length === 0 && (
            <div style={styles.noItems}>No recent games</div>
          )}
        </div>
      </div>
      <IonModal isOpen={showPassword} onDidDismiss={() => setShowPassword(false)}>
        <div className="ion-padding" style={{ background: '#000', color: '#fff', height: '100%' }}>
          <IonTitle>{selectedRoom ? `Enter Password – ${selectedRoom.id}` : 'Enter Password'}</IonTitle>
          <IonItem>
            <IonLabel position="stacked">Room Password</IonLabel>
            <IonInput type="password" value={passwordInput} onIonChange={(e) => setPasswordInput(e.detail.value!)} />
          </IonItem>
          <div style={{ marginTop: 12 }}>
            <IonButton expand="block" onClick={async () => {
              if (!selectedRoom) return;
              try {
                const res = await fetch(`${API_ORIGIN}/api/rooms/join/${selectedRoom.id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: passwordInput }) });
                const data = await res.json();
                if (data.success) {
                  setShowPassword(false);
                  history.push(`/lobby/${selectedRoom.id}`);
                } else {
                  setToast({ show: true, message: data.message || 'Invalid password' });
                }
              } catch {
                setToast({ show: true, message: 'Network error' });
              }
            }}>Join</IonButton>
            <IonButton expand="block" fill="clear" onClick={() => setShowPassword(false)}>Close</IonButton>
          </div>
        </div>
      </IonModal>
      <LoginModal isOpen={showLogin} onDidDismiss={()=>{setShowLogin(false)}} />
      </div>
    </IonPage>
  );
};

export default Home;
