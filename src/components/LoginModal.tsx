import React, { useEffect, useState } from 'react';
import { IonContent, IonModal, IonHeader, IonTitle, IonToolbar, IonInput, IonButton, IonItem, IonLabel, IonToast, IonLoading } from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import { useHistory } from 'react-router-dom';
import Ritual from '@/assets/imgs/ritualLogoBg.png';
import RitualLogo from '@/assets/imgs/ritualLogoBg.png';

interface LoginModalProps {
  isOpen: boolean;
  onDidDismiss: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onDidDismiss }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const history = useHistory();
  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      const data = ev.data;
      if (data && data.success && data.token && data.user) {
        login(data.token, { id: data.user.id, username: data.user.username, email: data.user.email || '', role: data.user.role, avatar_url: data.user.avatar_url });
        history.push('/');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [login, history]);

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
        setToastMessage('Login successful!');
        setShowToast(true);
        onDidDismiss();
        history.push('/');
      } else {
        setToastMessage(data.message || 'Login failed');
        setShowToast(true);
      }
    } catch (error) {
      setToastMessage('Network error');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };


  const styles = {
    modalWrap: { background: '#000', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    card: { width: '92%', maxWidth: 420, borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'linear-gradient(135deg, rgba(25,25,25,0.9), rgba(35,35,35,0.8))', padding: 16 },
    logoWrap: { width: 120, height: 120, borderRadius: '50%', margin: '0 auto 12px', overflow: 'hidden', boxShadow: '1px 5px 40px 10px rgba(255, 255, 255, 0.43)', border: '0px solid rgba(255,255,255,0.2)', background: '#000' },
    title: { textAlign: 'center' as const, fontSize: 20, fontWeight: 700, marginBottom: 8 },
    subtitle: { textAlign: 'center' as const, fontSize: 13, color: '#9CA3AF', marginBottom: 14 },
    item: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, marginBottom: 10, padding: 8 },
    inputVars: { ['--background' as any]: 'transparent', ['--color' as any]: '#fff', ['--placeholder-color' as any]: '#ffffffb3' } as React.CSSProperties,
    actions: { marginTop: 12 },
  };
  

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDidDismiss}>
      <div style={styles.modalWrap}>
        <div style={styles.card}>
          <div style={styles.logoWrap}>
            <img src={Ritual} alt="Ritual" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={styles.title}>Welcome to Ritual</div>
          <div style={styles.subtitle}>Sign in to continue</div>
          <div style={styles.item}>
            <IonLabel position="stacked">Email</IonLabel>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', background: 'transparent', color: '#fff', padding: 8, border: 'none', outline: 'none' }}
            />
          </div>
          <div style={styles.item}>
            <IonLabel position="stacked">Password</IonLabel>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', background: 'transparent', color: '#fff', padding: 8, border: 'none', outline: 'none' }}
            />
          </div>
          <div style={styles.actions}>
            <button style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', outline: 'none', background: '#fff', color: '#000', fontWeight: 700 }} onClick={handleLogin}>Login</button>
            <button style={{ width: '100%', marginTop: 12, padding: 12, borderRadius: 12, border: 'none', outline: 'none', background: 'transparent', color: '#fff', fontWeight: 700}} onClick={() => { history.push('/register'); onDidDismiss(); }}>Don't have an account? Register</button>
            <button
              style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', outline: 'none', background: '#000', color: '#fff', fontWeight: 700, boxShadow: "1px 5px 10px 2px rgba(255, 255, 255, 0.43)" }}
              onClick={() => {
                const w = 500, h = 600;
                const y = window.top ? (window.top.outerHeight - h) / 2 : 100;
                const x = window.top ? (window.top.outerWidth - w) / 2 : 100;
                window.open(`${import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000'}/api/auth/discord`, 'discord_oauth', `width=${w},height=${h},top=${y},left=${x}`);
              }}
            >
              Login with Discord
            </button>
          </div>
          <IonLoading isOpen={loading} message={'Logging in...'} />
          <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMessage} duration={2000} />
        </div>
      </div>
    </IonModal>
  );
};

export default LoginModal;
