import React, { useState, useEffect } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonButton, IonSearchbar, IonBadge, IonModal, IonItem, IonLabel, IonInput,
  IonButtons, IonSpinner, IonToast
} from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { useHistory } from 'react-router-dom';

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

  const { token } = useAuth();
  const history = useHistory();

  useEffect(() => {
    fetchRooms();
    const s = io('https://preprimary-chau-unmelodised.ngrok-free.dev');
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
      setFilteredRooms(rooms.filter(r => 
        r.title.toLowerCase().includes(lower) || 
        r.room_code.toLowerCase().includes(lower)
      ));
    }
  }, [searchText, rooms]);

  const fetchRooms = async () => {
    try {
      // Fetch public rooms
      const res = await fetch('https://preprimary-chau-unmelodised.ngrok-free.dev/api/rooms', {
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
      const res = await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/answers/my-status`, {
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
    if (room.is_public) {
      if (myStatus[room.id]?.participated) {
        history.push(`/lobby/${room.id}`);
        return;
      }
      // Direct join logic (navigate to lobby)
      setJoining(true);
      try {
        const res = await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/rooms/join/${room.id}`, {
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
      const res = await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/rooms/join/${selectedRoom.id}`, {
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton routerLink="/home">Back</IonButton></IonButtons>
          <IonTitle>Join a Quiz</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar 
            value={searchText} 
            onIonChange={e => setSearchText(e.detail.value!)} 
            placeholder="Search by title or code"
          />
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {loading ? (
          <div className="flex justify-center mt-10"><IonSpinner /></div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center mt-10 text-gray-500">No active rooms found.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRooms.map(room => (
              <IonCard key={room.id}>
                <IonCardHeader>
                  <div className="flex justify-between items-center">
                    <IonCardTitle className="text-lg">{room.title}</IonCardTitle>
                    <IonBadge color={room.is_public ? "success" : "warning"}>
                      {room.is_public ? "Public" : "Private"}
                    </IonBadge>
                  </div>
                  <IonCardSubtitle>Code: {room.room_code}</IonCardSubtitle>
                  
                  {/* Status pill and countdown for private waiting */}
                  <div className="mt-2 text-sm">
                    {room.isPublic ? (
                      <IonBadge color="success">Published</IonBadge>
                    ) : room.status === 'waiting' ? (
                      <IonBadge color="warning">Waiting</IonBadge>
                    ) : room.status === 'started' ? (
                      <IonBadge color="tertiary">Started</IonBadge>
                    ) : room.status === 'ended' ? (
                      <IonBadge color="medium">Ended</IonBadge>
                    ) : null}
                    {!room.isPublic && room.status === 'waiting' && room.countdown != null && (
                      <p className="text-xs text-gray-400 mt-1">Starts in {room.countdown}s</p>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 mt-1">
                    Participants: {room.participant_count} / {room.max_participants}
                  </p>
                </IonCardHeader>
                <IonCardContent>
                  <IonButton expand="block" onClick={() => handleJoinClick(room)}>
                    {room.is_public ? (myStatus[room.id]?.participated ? "View Stats" : "Join Now") : "Enter Password"}
                  </IonButton>
                </IonCardContent>
              </IonCard>
            ))}
          </div>
        )}

        <IonModal isOpen={showPasswordModal} onDidDismiss={() => setShowPasswordModal(false)} className="auto-height">
          <IonHeader>
            <IonToolbar>
              <IonTitle>Enter Password</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowPasswordModal(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Room Password</IonLabel>
              <IonInput 
                type="password" 
                value={password} 
                onIonInput={e => setPassword(e.detail.value!)} 
              />
            </IonItem>
            <div className="mt-4">
              <IonButton expand="block" onClick={submitPassword} disabled={joining}>
                {joining ? 'Verifying...' : 'Join Room'}
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        <IonToast 
          isOpen={toast.show} 
          onDidDismiss={() => setToast({ ...toast, show: false })} 
          message={toast.message} 
          duration={2000} 
        />
      </IonContent>
    </IonPage>
  );
};

export default JoinQuiz;
