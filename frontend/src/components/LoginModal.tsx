import React, { useEffect, useState } from 'react';
import { IonContent, IonModal, IonHeader, IonPage, IonTitle, IonToolbar, IonInput, IonButton, IonItem, IonLabel, IonToast, IonLoading } from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import { useHistory } from 'react-router-dom';

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
      const response = await fetch('https://preprimary-chau-unmelodised.ngrok-free.dev/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (data.success) {
        login(data.token, data.user);
        setToastMessage('Login successful!');
        setShowToast(true);
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

  return (
    <IonModal>
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
          <IonButton expand="block" fill="clear" routerLink="/register">Don't have an account? Register</IonButton>
          <IonButton 
            expand="block" 
            color="tertiary"
            onClick={() => {
              const w = 500, h = 600;
              const y = window.top ? (window.top.outerHeight - h) / 2 : 100;
              const x = window.top ? (window.top.outerWidth - w) / 2 : 100;
              window.open('https://preprimary-chau-unmelodised.ngrok-free.dev/api/auth/discord', 'discord_oauth', `width=${w},height=${h},top=${y},left=${x}`);
            }}
          >
            Login with Discord
          </IonButton>
        </div>
        <IonLoading isOpen={loading} message={'Logging in...'} />
        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMessage} duration={2000} />
      </IonContent>
    </IonModal>
  );
};

export default LoginModal;
