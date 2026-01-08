import React, { useState, useEffect } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonButton, IonSearchbar, IonBadge, IonModal, IonItem, IonLabel, IonInput,
  IonButtons, IonSpinner, IonToast, IonSegment, IonSegmentButton
} from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { useHistory } from 'react-router-dom';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000';

// Separate component for Countdown to prevent parent re-renders
const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        
        if (days > 0) setTimeLeft(`${days}d ${hours}h`);
        else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`);
        else setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft("Started");
      }
    };

    updateTimer(); // Initial call
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return <span className="font-semibold text-blue-600">Starts in: {timeLeft}</span>;
};

interface Room {
  id: number;
  room_code?: string;
  title: string;
  max_participants?: number;
  status?: string;
  is_public?: number; // 1 or 0
  created_at?: string;
  start_time?: string | null;
  participant_count: number;
  host_id?: number;
  // Live fields from socket snapshot
  isPublic?: boolean;
  countdown?: number | null;
}

const JoinQuiz: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Password Modal
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [password, setPassword] = useState<string>('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [joining, setJoining] = useState(false);
  
  const [toast, setToast] = useState({ show: false, message: '' });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [myStatus, setMyStatus] = useState<Record<number, { participated: boolean; completed: boolean }>>({});

  const { token, user } = useAuth();
  const history = useHistory();

  useEffect(() => {
    fetchRooms();
    const s = io(API_ORIGIN);
    setSocket(s);
    s.emit('subscribe_rooms');
    s.on('rooms_snapshot', (snapshot: any[]) => {
      // Merge snapshot into existing list, preserving searchable fields
      setRooms((prev) => {
        const map = new Map<number, Room>();
        prev.forEach(r => map.set(r.id, r));
        snapshot.forEach(r => {
          const existing = map.get(r.id);
          map.set(r.id, {
            id: r.id,
            title: r.title,
            participant_count: r.participantCount,
            isPublic: r.isPublic,
            status: r.status,
            countdown: r.countdown,
            // keep previous optional fields if we had them
            room_code: existing?.room_code,
            max_participants: existing?.max_participants,
            is_public: existing?.is_public,
            created_at: existing?.created_at,
            start_time: existing?.start_time,
          });
        });
        const arr = Array.from(map.values());
        const ids = arr.map(r => r.id);
        fetchMyStatus(ids);
        return arr;
      });
    });
    return () => { s.disconnect(); };
  }, []);

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredRooms(rooms);
    } else {
      const lower = searchText.toLowerCase();
      setFilteredRooms(
        rooms.filter(r => {
          const title = (r.title || '').toLowerCase();
          const code = (r.room_code || '').toLowerCase();
          return title.includes(lower) || code.includes(lower);
        })
      );
    }
  }, [searchText, rooms]);

  const fetchRooms = async () => {
    try {
      // Fetch public rooms
      const res = await fetch(`${API_ORIGIN}/api/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` } // Optional if public endpoint doesn't need token, but good practice
      });
      const data = await res.json();
      if (data.success) {
        setRooms(data.rooms);
        setFilteredRooms(data.rooms);
        const ids = (data.rooms || []).map((r: any) => r.id);
        fetchMyStatus(ids);
      }
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'Failed to load rooms' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMyStatus = async (roomIds: number[]) => {
    try {
      if (!roomIds || roomIds.length === 0) return;
      const res = await fetch(`${API_ORIGIN}/api/answers/my-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roomIds })
      });
      const data = await res.json();
      if (data.success) {
        const map: Record<number, { participated: boolean; completed: boolean }> = {};
        for (const s of data.status || []) map[s.roomId] = { participated: !!s.participated, completed: !!s.completed };
        setMyStatus(map);
      }
    } catch {}
  };

  const handleJoinClick = async (room: Room) => {
    if (room.host_id && user && user.id === room.host_id) {
      setToast({ show: true, message: 'You cannot participate in a room you created' });
      return;
    }
    if (room.is_public) {
      if (myStatus[room.id]?.participated) {
        history.push(`/lobby/${room.id}`);
        return;
      }
      // Direct join logic (navigate to lobby)
      setJoining(true);
      try {
        const res = await fetch(`${API_ORIGIN}/api/rooms/join/${room.id}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({}) // No password for public rooms
        });
        const data = await res.json();
        
        if (data.success) {
          if (room.start_time) {
            try {
              localStorage.setItem(`room_start_time_${room.id}`, room.start_time);
            } catch {}
          }
          history.push(`/lobby/${room.id}`);
        } else {
          setToast({ show: true, message: data.message || 'Failed to join room' });
        }
      } catch (err) {
        setToast({ show: true, message: 'Network error' });
      } finally {
        setJoining(false);
      }
    } else {
      // Show password modal
      setSelectedRoom(room);
      setPassword('');
      setShowPasswordModal(true);
    }
  };

  const submitPassword = async () => {
    if (!selectedRoom || !password) return;
    
    setJoining(true);
    try {
      const res = await fetch(`${API_ORIGIN}/api/rooms/join/${selectedRoom.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      
      if (data.success) {
        setShowPasswordModal(false);
        if (selectedRoom.start_time) {
          try {
            localStorage.setItem(`room_start_time_${selectedRoom.id}`, selectedRoom.start_time);
          } catch {}
        }
        history.push(`/lobby/${selectedRoom.id}`);
      } else {
        setToast({ show: true, message: data.message || 'Invalid password' });
      }
    } catch (err) {
      setToast({ show: true, message: 'Network error' });
    } finally {
      setJoining(false);
    }
  };

  const styles = {
    page: { backgroundColor: '#000' },
    toolbar: { backgroundColor: '#000', color: '#fff', padding: 0 },
    backBtn: { border: '1px solid rgba(255,255,255,0.2)', color: '#fff', background: 'rgba(66,66,66,0.6)', padding: '6px 12px', borderRadius: 20 },
    searchVars: {
      ['--background' as any]: 'rgba(255, 255, 255, 0.51)',
      ['--color' as any]: '#fff',
      ['--placeholder-color' as any]: '#ffffffd6',
      ['--border-radius' as any]: '24px',
    } as React.CSSProperties,
    searchInline: { backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)' },
    content: { backgroundColor: '#000', color: '#fff' },
    container: { padding: 12, color: '#fff' },
    section: { marginTop: 8 },
    sectionTitle: { fontSize: 16, fontWeight: 600 as const, marginBottom: 8, color: '#fff' },
    grid: { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
    card: { backgroundColor: '#121212', color: '#fff', border: '1px solid #333' },
    headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    subtitle: { fontSize: 12, color: '#9CA3AF' },
    meta: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
    glassInputItem: { background: 'rgba(31, 31, 31, 0.1)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderRadius: 12, padding: 8 },
    glassInputVars: {
      ['--background' as any]: 'transparent',
      ['--color' as any]: '#fff',
      ['--placeholder-color' as any]: '#ffffffc9',
      ['--padding-start' as any]: '8px',
      ['--padding-end' as any]: '8px',
    } as React.CSSProperties,
  };

  const publicRooms = filteredRooms.filter(r => r.is_public === 1 || r.isPublic);
  const privateRooms = filteredRooms.filter(r => !(r.is_public === 1 || r.isPublic));
  const [segment, setSegment] = useState<'public' | 'private'>('public');

  return (
    <IonPage style={styles.page}>

      <div style={styles.content}>
                  <IonButtons slot="start">
            <div style={styles.backBtn} onClick={() => history.push('/home')}>Back</div>
          </IonButtons>
          <IonSearchbar
            value={searchText}
            onIonInput={(e: any) => setSearchText(e.detail?.value ?? '')}
            onIonClear={() => setSearchText('')}
            placeholder="Search by title or code"
            style={{ ...styles.searchVars, ...styles.searchInline }}
          />
      <div style={styles.container}>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: 24 }}><IonSpinner /></div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <IonSegment
                value={segment}
                onIonChange={(e: any) => setSegment((e.detail?.value as any) || 'public')}
                style={{
                  ['--background' as any]: 'rgba(255,255,255,0.06)',
                  ['--indicator-color' as any]: '#22c55e',
                  ['--border-radius' as any]: '20px',
                  ['--color' as any]: '#000',
                  ['--color-checked' as any]: '#000'
                } as React.CSSProperties}
              >
                <IonSegmentButton style={{color: segment === 'public' ? '#000' : '#fff'}} value="public">
                  Public
                </IonSegmentButton>
                <IonSegmentButton style={{color: segment === 'private' ? '#000' : '#fff'}} value="private">
                  Private
                </IonSegmentButton>
              </IonSegment>
            </div>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>{segment === 'public' ? 'Public Rooms' : 'Private Rooms'}</div>
              <div style={styles.grid as React.CSSProperties}>
                {(segment === 'public' ? publicRooms : privateRooms).map(room => (
                  <IonCard key={room.id} style={styles.card}>
                    <IonCardHeader>
                      <div style={styles.headerRow as React.CSSProperties}>
                        <IonCardTitle style={{color: '#fff', fontWeight: 700}}>{room.title}</IonCardTitle>
                        <IonBadge color={segment === 'public' ? 'success' : 'warning'}>{segment === 'public' ? 'Public' : 'Private'}</IonBadge>
                      </div>
                      <IonCardSubtitle style={styles.subtitle}>Code: {room.room_code}</IonCardSubtitle>
                      {segment === 'private' && (
                        <div style={styles.meta}>
                          {room.status === 'waiting' ? (
                            <IonBadge color="warning">Waiting</IonBadge>
                          ) : room.status === 'started' ? (
                            <IonBadge color="tertiary">Started</IonBadge>
                          ) : room.status === 'ended' ? (
                            <IonBadge color="medium">Ended</IonBadge>
                          ) : null}
                          {!room.isPublic && room.status === 'waiting' && room.countdown != null && (
                            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Starts in {room.countdown}s</div>
                          )}
                        </div>
                      )}
                      <div style={styles.meta}>Participants: {room.participant_count} {room.max_participants ? `/ ${room.max_participants}` : ''}</div>
                    </IonCardHeader>
                    <IonCardContent>
                      <button style={{color: 'white', border: '1px solid white', padding: 4, borderRadius: 4, background: 'green'}} onClick={() => handleJoinClick(room)}>
                        {segment === 'public' ? (myStatus[room.id]?.participated ? 'View Stats' : 'Join Now') : 'Enter Password'}
                      </button>
                    </IonCardContent>
                  </IonCard>
                ))}
                {(segment === 'public' ? publicRooms : privateRooms).length === 0 && (
                  <div style={styles.subtitle}>No {segment} rooms</div>
                )}
              </div>
            </div>
          </>
        )}

        <IonModal isOpen={showPasswordModal} onDidDismiss={() => setShowPasswordModal(false)} className="auto-height">
          <div className="ion-padding" style={{background: "black", height: '100vh'}}>
                            <IonButton onClick={() => setShowPasswordModal(false)}>Close</IonButton>
             <div style={{color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 24, textAlign: 'center'}}>{selectedRoom ? ` ${selectedRoom.title}` : 'Enter Password'}</div>
            <div style={styles.glassInputItem}>
              <IonLabel style={{ color: '#fff', fontSize: 20, fontWeight: 600 }}  position="stacked">Room Password</IonLabel>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', background: '#ffffffa7', color: '#fff', padding: 8, border: 'none', outline: 'none', borderRadius: 20, height: 40 }}
              />
            </div>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button style={{color: 'white', border: '0px solid white', padding: 4, borderRadius: 20, background: 'green', width: '90%', margin: 'auto', height: 40, fontSize: 20}}  onClick={submitPassword} disabled={joining}>
                {joining ? 'Verifying...' : 'Join Room'}
              </button>
            </div>
          </div>
        </IonModal>

        <IonToast 
          isOpen={toast.show} 
          onDidDismiss={() => setToast({ ...toast, show: false })} 
          message={toast.message} 
          duration={2000} 
        />
      </div>
      </div>
    </IonPage>
  );
};

export default JoinQuiz;
