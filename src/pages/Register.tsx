import React, { useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonInput, IonButton, IonItem, IonLabel, IonToast, IonLoading } from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import { useHistory } from 'react-router-dom';
import LoginModal from '@/components/LoginModal';
import Ritual from '@/assets/imgs/ritualLogoBg.png';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'participant' | 'host'>('participant');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const history = useHistory();

  const handleRegister = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000'}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();

      if (data.success) {
        login(data.token, data.user);
        setToastMessage('Registration successful!');
        setShowToast(true);
        history.push('/');
      } else {
        setToastMessage(data.message || 'Registration failed');
        setShowToast(true);
      }
    } catch (error) {
      setToastMessage('Network error');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const styles = {
    modalWrap: { background: '#000', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    card: { width: '92%', maxWidth: 420, borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'linear-gradient(135deg, rgba(25,25,25,0.9), rgba(35,35,35,0.8))', padding: 16 },
    logoWrap: { width: 120, height: 120, borderRadius: '50%', margin: '0 auto 12px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' },
    title: { textAlign: 'center' as const, fontSize: 20, fontWeight: 700, marginBottom: 8 },
    subtitle: { textAlign: 'center' as const, fontSize: 13, color: '#9CA3AF', marginBottom: 14 },
    item: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, marginBottom: 10, padding: 12 },
    inputVars: { ['--background' as any]: 'transparent', ['--color' as any]: '#fff', ['--placeholder-color' as any]: '#ffffffb3' } as React.CSSProperties,
    actions: { marginTop: 12 },
  };

  return (
    <IonPage>
      <IonContent>
        <div style={styles.modalWrap}>
          <div style={styles.card}>
            <div style={styles.logoWrap}>
              <img src={Ritual} alt="Ritual" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={styles.title}>Create your Ritual account</div>
            <div style={styles.subtitle}>Join and start playing</div>
            <div style={styles.item}>
              <IonLabel position="stacked">Username</IonLabel>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: '100%', background: 'transparent', color: '#fff', padding: 8, border: 'none', outline: 'none' }}
              />
            </div>
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
              <button  style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', outline: 'none', background: '#000', color: '#fff', fontWeight: 700, boxShadow: "1px 5px 10px 2px rgba(255, 255, 255, 0.43)" }} onClick={handleRegister}>Register</button>
              <button  style={{ width: '100%', marginTop: 12, padding: 12, borderRadius: 12, border: 'none', outline: 'none', background: 'transparent', color: '#fff', fontWeight: 700}} onClick={() => setLoginModalOpen(true)}>Already have an account? Login</button>
              <button style={{ width: '100%', marginTop: 12, padding: 12, borderRadius: 12, border: 'none', outline: 'none', background: '#5865F2', color: '#fff', fontWeight: 700}} onClick={() => {
                const w = 500, h = 600;
                const y = window.top ? (window.top.outerHeight - h) / 2 : 100;
                const x = window.top ? (window.top.outerWidth - w) / 2 : 100;
                window.open(`${import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000'}/api/auth/discord`, 'discord_oauth', `width=${w},height=${h},top=${y},left=${x}`);
              }}>Login with Discord</button>
            </div>
            <IonLoading isOpen={loading} message={'Registering...'} />
            <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMessage} duration={2000} />
          </div>
        </div>
      </IonContent>
      <LoginModal isOpen={loginModalOpen} onDidDismiss={() => setLoginModalOpen(false)} />
    </IonPage>
  );
};

export default Register;
