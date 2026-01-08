import React, { useEffect, useRef, useState } from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonBadge, IonButton } from '@ionic/react';
import ritualLogo from '@/assets/imgs/ritualLogoBg.png';

type Room = { id: number; title: string; participant_count: number; cover_photo_url?: string; is_public?: number | boolean; host_id?: number };

interface Props {
  rooms: Room[];
  isAuthenticated: boolean;
  onJoin: (room: Room) => void;
  participatedIds?: number[];
}

const PublicRoomSlider: React.FC<Props> = ({ rooms, isAuthenticated, onJoin, participatedIds = [] }) => {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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
  }, [rooms]);

  const API_ORIGIN = 'http://localhost:5000';
  const styles = {
    rail: { display: 'flex', gap: 8, marginTop: 0, overflowX: 'auto' as const, paddingBottom: 0, paddingLeft: 8, paddingRight: 8, scrollSnapType: 'x mandatory' as any },
    cardWrap: { margin: 0, minWidth: '80%', height: 300, borderRadius: 30, scrollSnapAlign: 'center', transition: 'transform 300ms ease-out, opacity 300ms ease-out', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundSize: 'cover', display: 'flex' },
    card: {width: '100%', margin: 0, position: 'relative' as const, height: '100%', borderRadius: 30, backgroundColor: 'rgba(255, 255, 255, 0.91)', color: '#fff', border: '2px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' },
    cardTitle: { fontSize: 18, fontWeight: 700, paddingInline: 8, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' },
    meta: { fontSize: 12, color: '#9CA3AF', marginTop: 0, border: "0px solid white", display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1f1f1f92', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 8 },
    metaSpacer: { marginLeft: 8, border: "0px solid white" },
    noItems: { fontSize: 14, color: '#9CA3AF' },
  };

  

  return (
    <>
      <style>{`
        .rail-no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .rail-no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      <div ref={railRef} style={styles.rail} className="rail-no-scrollbar">
        {rooms.map((r, idx) => (
          <div
            key={r.id}
            style={{
              ...styles.cardWrap,
              transform: idx === activeIndex ? 'scale(1)' : 'scale(0.95)',
              opacity: idx === activeIndex ? 1 : 0.7,
              backgroundImage: (() => {
                const raw = (r.cover_photo_url || '').replace(/\\/g, '/');
                // console.log(r.cover_photo_url)
                if (!raw) return `url(${ritualLogo})`;
                if (raw.startsWith('/uploads')) return `url(${API_ORIGIN}${raw})`;
                if (raw.startsWith('uploads/')) return `url(${API_ORIGIN}/${raw})`;
                return `url(${raw})`;
              })(),
            }}
          >
            <div
              style={{
                ...styles.card,
                backdropFilter: idx === activeIndex ? 'blur(0px)' : 'blur(8px)',
                WebkitBackdropFilter: idx === activeIndex ? 'blur(0px)' : 'blur(8px)',
                backgroundColor: idx === activeIndex ? 'rgba(61, 61, 61, 0.0)' : 'rgba(61, 61, 61, 0.35)'
              }}
            >
                <div style={styles.meta}>
                  {/* <IonBadge color="success">Published</IonBadge> */}
                  <div style={styles.cardTitle}>{r.title}</div>
                  <div style={{...styles.metaSpacer, border: "0px solid white", paddingInline: 8, color: 'green', fontSize: 19, fontWeight: 800}}>{r.participant_count}</div>
                </div>
              
                <button style={{marginTop: "auto", position: "absolute", height: 50, bottom: 0, left: 0, right: 0, border: "1px solid white", borderBottomLeftRadius: 30, borderBottomRightRadius: 30, background: '#ffffff8b', color: (isAuthenticated ? (participatedIds.includes(r.id) ? 'yellow' : 'green') : '#000'), fontWeight: 700, fontSize: 18 }}  onClick={() => onJoin(r)}>
                  {isAuthenticated ? (participatedIds.includes(r.id) ? 'View Stats' : 'Start Quiz') : 'Login to Join'}
                </button>
            </div>
          </div>
        ))}
        {rooms.length === 0 && (
          <div style={styles.noItems}>No recent public tests</div>
        )}
      </div>
    </>
  );
};

export default PublicRoomSlider;
