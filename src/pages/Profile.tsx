import React, { useEffect, useState } from 'react';
import { IonPage, IonContent, IonButton } from '@ionic/react';
import { useAuth } from '@/context/AuthContext';
import { useHistory } from 'react-router-dom';
import Ritual from '@/assets/imgs/ritualLogoBg.png';

const Profile: React.FC = () => {
  const { user, token, logout } = useAuth();
  const history = useHistory();
  const [score, setScore] = useState<{ total: number; correct: number; answered: number }>({ total: 0, correct: 0, answered: 0 });
  const [loading, setLoading] = useState(true);
  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000';

  const handleAvatarUpload = async (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await fetch(`${API_ORIGIN}/api/upload/avatar-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (data.success) {
        // update user context
      }
    } catch {}
  };

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${API_ORIGIN}/api/users/me/score`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) setScore({ total: data.total_score || 0, correct: data.correct || 0, answered: data.answered || 0 });
      } catch {}
      setLoading(false);
    };
    run();
  }, [token]);

  const resolveAvatar = (avatar?: string) => {
    if (!avatar) return Ritual;
    if (avatar.startsWith('http')) return avatar;
    if (avatar.startsWith('/')) return `${API_ORIGIN}${avatar}`;
    return `${API_ORIGIN}/${avatar}`;
  };

  const styles = {
    wrap: { background: '#000', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    card: { width: '92%', maxWidth: 420, borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'linear-gradient(135deg, rgba(25,25,25,0.9), rgba(35,35,35,0.8))', padding: 16 },
    avatar: { width: 96, height: 96, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.25)', overflow: 'hidden', margin: '0 auto 12px' },
    title: { textAlign: 'center' as const, fontSize: 20, fontWeight: 700 },
    subtitle: { textAlign: 'center' as const, fontSize: 13, color: '#9CA3AF', marginTop: 4 },
    stats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 },
    statItem: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, padding: 12, textAlign: 'center' as const },
    actions: { marginTop: 16 },
  };

  return (
    <IonPage>
      <IonContent>
        <div style={styles.wrap}>
          <div style={styles.card}>
            <div style={styles.avatar}>
              <img src={resolveAvatar(user?.avatar_url)} alt={user?.username || 'avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = Ritual; }} />
            </div>
            <div style={styles.title}>{user?.username || 'User'}</div>
            <div style={styles.subtitle}>{user?.email || ''}</div>
            <div style={styles.stats}>
              <div style={styles.statItem}>
                <div>Points</div>
                <div style={{ fontWeight: 700 }}>{loading ? '...' : score.total}</div>
              </div>
              <div style={styles.statItem}>
                <div>Correct</div>
                <div style={{ fontWeight: 700 }}>{loading ? '...' : score.correct}</div>
              </div>
              <div style={styles.statItem}>
                <div>Answered</div>
                <div style={{ fontWeight: 700 }}>{loading ? '...' : score.answered}</div>
              </div>
            </div>
            <div style={styles.actions}>
              <IonButton expand="block" onClick={() => history.push('/home')}>Back</IonButton>
              <IonButton expand="block" fill="outline" onClick={() => { logout(); history.push('/home'); }}>Logout</IonButton>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Profile;
