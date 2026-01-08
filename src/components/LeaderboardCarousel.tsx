import React, { useEffect, useRef, useState } from 'react';
import { IonCardTitle } from '@ionic/react';
import { io, Socket } from 'socket.io-client';
import ritualLogo from '@/assets/imgs/ritualLogoBg.png';

type Player = {
  userId: number;
  username: string;
  avatarUrl?: string;
  score: number;
  correct: number;
  answered: number;
  rooms: number;
  position: number;
};

interface LeaderboardProps {
  overlay?: boolean;
  position?: Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
}

const LeaderboardCarousel: React.FC<LeaderboardProps> = ({ overlay = true, position }) => {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io('http://localhost:5000');
    setSocket(s);
    s.emit('subscribe_global_leaderboard');
    s.on('global_leaderboard_snapshot', (payload: Player[]) => {
      setPlayers(payload);
    });
    return () => { s.disconnect(); };
  }, []);

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
  }, [players]);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveIndex((prev) => {
        const next = players.length ? (prev + 1) % players.length : 0;
        const el = railRef.current;
        if (!el) return next;
        const child = el.children[next] as HTMLElement | undefined;
        if (child) child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        return next;
      });
    }, 3000);
    return () => clearInterval(id);
  }, [players]);

  const API_ORIGIN = 'http://localhost:5000';
  const containerBase = overlay
    ? ({ position: 'fixed' as const, bottom: 110, right: 16, zIndex: 900 })
    : ({ position: 'static' as const });
  const containerPos = overlay && position ? { ...containerBase, ...position } as React.CSSProperties : containerBase as React.CSSProperties;

  const styles = {
    container: { ...containerPos, height: 200, overflow: 'hidden' as const, border: "0px solid white" },
    rail: { display: 'flex', gap: 8, marginTop: 0, overflowX: 'auto' as const, paddingBottom: 0, paddingLeft: 0, paddingRight: 8, scrollSnapType: 'x mandatory' as any, width: overlay ? 320 : '100%' },
    cardWrap: { margin: 0, minWidth: overlay ? 320 : '90%', height: 160, borderRadius: 16, scrollSnapAlign: 'center', transition: 'transform 300ms ease-out, opacity 300ms ease-out', background: 'linear-gradient(135deg, #111 0%, #222 100%)', display: 'flex' },
    // card: { display: 'flex',  justifyContent: 'space-around', alignItems: 'center', borderRadius: 16, color: '#fff', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', padding: 12 },
    // row: { width: '50%', textAlign: 'center' as const, border: "1px solid white" },
    card: { border: '0px solid white', padding: 12, width: '100%', height: '100%', display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: '#ffffff52', borderRadius: 20, },
    row: { width: '40%', border: "0px solid white", display: 'block', alignItems: 'center', textAlign: 'center' as const },
    name: { fontSize: 18, fontWeight: 600 as const, color: "white", border: "1px solid white", borderRadius: 20, marginTop: 8, marginLeft: 12, background: 'rgba(255,255,255,0.1)' },
    score: { fontSize: 18, fontWeight: 700 as const, color: 'white' },
    meta: { fontSize: 12, color: '#9CA3AF' },
    posBadge: { fontSize: 50, padding: '2px 8px', borderRadius: 9999, border: '0px solid #fff', color: 'white', fontWeight: 700 as const },
    avatar: { borderRadius: '50%', border: '0px solid #fff',objectFit: 'cover' as const },
  };

  return (
    <div style={styles.container}>
      <div style={{color: 'white', border: '0px solid white', textAlign: 'center', fontSize: 19, fontWeight: 600}}>Top 3 Players at the moment!</div>
      <div ref={railRef} style={styles.rail} className="rail-no-scrollbar">
        {players.map((p, idx) => (
          <div
            key={p.userId}
            style={{
              ...styles.cardWrap,
              transform: idx === activeIndex ? 'scale(1)' : 'scale(0.95)',
              opacity: idx === activeIndex ? 1 : 0.75,
            }}
          >
            <div style={{ ...styles.card, backdropFilter: idx === activeIndex ? 'blur(0px)' : 'blur(6px)', WebkitBackdropFilter: idx === activeIndex ? 'blur(0px)' : 'blur(6px)' }}>
              <div style={styles.row}>
                <div style={styles.posBadge}>{p.position === 1 ? '🥇' : p.position === 2 ? '🥈' : p.position === 3 ? '🥉' : '🏅'}</div>
                <div style={styles.score}>Points - {p.score}</div>
              </div>
              <div style={styles.row}>
                <div style={{ width: '80%', marginLeft: 20 }}>
                  <img
                    style={{
                      ...styles.avatar,
                      border: `8px solid ${p.position === 1 ? '#FFD700' : p.position === 2 ? '#C0C0C0' : p.position === 3 ? '#CD7F32' : '#fff'}`,
                    }}
                    src={(() => {
                      const raw = p.avatarUrl || '';
                      if (!raw) return ritualLogo as any;
                      if (raw.startsWith('/uploads')) return `${API_ORIGIN}${raw}`;
                      return raw;
                    })()}
                    alt={p.username}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = ritualLogo as any; }}
                  />
                </div>
                <div style={styles.name}>{p.username}</div>
              </div>
            </div>
          </div>
        ))}
        {players.length === 0 && (
          <div style={styles.meta}>No leaderboard data</div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardCarousel;
