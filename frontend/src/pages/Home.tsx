import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonBadge, IonModal, IonItem, IonLabel, IonInput, IonToast, IonLoading } from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useRef } from 'react';

const Home: React.FC = () => {
  const { user, logout, token, login } = useAuth();
  const history = useHistory();
  const [recent, setRecent] = useState<Array<{ id: number; title: string; participant_count: number; published_at?: string }>>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [targetRoom, setTargetRoom] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const railRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('http://localhost:5000/api/rooms/public', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
        const data = await res.json();
        if (data.success) setRecent(data.rooms || []);
      } catch {}
    })();
  }, [token]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    let rAF = 0;
    const onScroll = () => {
      if (rAF) return;
      rAF = requestAnimationFrame(() => {
        rAF = 0;
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        let best = 0;
        let bestDist = Infinity;
        const cards = Array.from(el.children) as HTMLElement[];
        for (let i = 0; i < cards.length; i++) {
          const cRect = cards[i].getBoundingClientRect();
          const cCenter = cRect.left + cRect.width / 2;
          const dist = Math.abs(cCenter - centerX);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        }
        setActiveIndex(best);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      el.removeEventListener('scroll', onScroll as any);
      if (rAF) cancelAnimationFrame(rAF);
    };
  }, [railRef, recent]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
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

  const onJoinClick = (roomId: number) => {
    if (user) {
      history.push(`/lobby/${roomId}`);
    } else {
      setTargetRoom(roomId);
      setShowLogin(true);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>RitualQuiz</IonTitle>
          <IonButton slot="end" fill="clear" onClick={user ? logout : () => setShowLogin(true)}>{user ? 'Logout' : 'Login'}</IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">RitualQuiz</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="container mx-auto p-4 text-center">
          <h2 className="text-xl mb-4">Welcome, {user?.username || "Guest"}!</h2>

          <div className="mt-6 text-left">
            <h3 className="text-lg font-semibold mb-2">All Public Tests</h3>
            <div ref={railRef} className="flex gap-2 overflow-x-auto pb-2 px-2 snap-x snap-mandatory">
              {recent.map((r, idx) => (
                <IonCard key={r.id} className={`m-0 snap-center transition-transform duration-300 ease-out min-w-[80%] md:min-w-[60%] ${idx === activeIndex ? 'scale-100' : 'scale-95 opacity-80'}`}>
                  <IonCardHeader>
                    <IonCardTitle className="text-base truncate">{r.title}</IonCardTitle>
                    <div className="text-xs text-gray-500 mt-1">
                      <IonBadge color="success">Published</IonBadge>
                      <span className="ml-2">Participants: {r.participant_count}</span>
                    </div>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonButton expand="block" size="small" onClick={() => onJoinClick(r.id)}>
                      {user ? 'Join' : 'Login to Join'}
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              ))}
              {recent.length === 0 && (
                <div className="text-sm text-gray-500">No recent public tests</div>
              )}
            </div>
          </div>
          <IonModal isOpen={showLogin} onDidDismiss={() => setShowLogin(false)}>
            <IonHeader>
              <IonToolbar>
                <IonTitle>Login</IonTitle>
              </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
              <IonItem>
                <IonLabel position="stacked">Email</IonLabel>
                <IonInput value={email} onIonChange={e => setEmail(e.detail.value!)} type="email" />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Password</IonLabel>
                <IonInput value={password} onIonChange={e => setPassword(e.detail.value!)} type="password" />
              </IonItem>
              <div className="ion-padding-top">
                <IonButton expand="block" onClick={handleLogin}>Login</IonButton>
              </div>
              <IonLoading isOpen={loading} message={'Logging in...'} />
              <IonToast isOpen={toast.show} onDidDismiss={() => setToast({ ...toast, show: false })} message={toast.message} duration={2000} />
            </IonContent>
          </IonModal>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
