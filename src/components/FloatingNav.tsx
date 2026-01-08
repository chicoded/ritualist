import React, { useEffect, useRef, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { home, list, globe, personCircle } from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { AlignCenter } from 'lucide-react';

const FloatingNav: React.FC = () => {
  const history = useHistory();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const location = useLocation();
  const routeKeyRef = useRef<string | null>(null);

  const styles = {
    wrap: {
      position: 'fixed' as const,
      bottom: 20,
      right: 13,
      zIndex: 1000,
      // border: "2px solid yellow",
      width: "93%",
      // background: "red"
    },
    bar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-evenly',
      gap: 8,
      backgroundColor: '#1f2937',
      color: '#fff',
      padding: 8,
      borderRadius: 999,
      // border: '1px solid #3741514d',
      boxShadow: '1px 1px 15px rgba(209, 206, 206, 0.72)',
    },
    btn: {
      minWidth: 0,
      height: 36,
      outline: 'none',
      boxShadow: 'none',
      borderRadius: 20,
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: 20
    },
    labelWrap: {
      overflow: 'hidden',
      transition: 'max-width 200ms ease, opacity 200ms ease, margin-left 200ms ease',
      display: 'inline-block',
      verticalAlign: 'middle',
    } as React.CSSProperties,
    labelText: {
      fontSize: 14,
      fontWeight: 600,
      color: '#fff',
      whiteSpace: 'nowrap' as const,
    },
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const path = location.pathname;
    const key = path === '/' || path.startsWith('/home')
      ? 'home'
      : path.startsWith('/join')
        ? 'join'
        : path.startsWith('/dashboard')
          ? 'dashboard'
          : path.startsWith('/leaderboard/global')
            ? 'global'
            : null;
    setActiveKey(key);
    routeKeyRef.current = key;
  }, [location.pathname]);

  const activate = (key: string) => {
    setActiveKey(key);
  };

  const deactivate = () => {
    setActiveKey(routeKeyRef.current);
  };

  const touchActivate = (key: string) => {
    setActiveKey(key);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setActiveKey(routeKeyRef.current), 1500);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.bar}>
        <div
          style={{
            ...styles.btn,
            border: activeKey === 'home' ? '1px solid #ffffff' : '1px solid transparent',
            backgroundColor: activeKey === 'home' ? '#fff' : 'transparent',
            color: activeKey === 'home' ? '#000' : '#fff',
          }}
          onClick={() => history.push('/home')}
          onMouseEnter={() => activate('home')}
          onMouseLeave={deactivate}
          onFocus={() => activate('home')}
          onBlur={deactivate}
          onTouchStart={() => touchActivate('home')}
        >
          <IonIcon icon={home} style={{ width: 20, height: 20 }} />
          <span
            style={{
              ...styles.labelWrap,
              maxWidth: activeKey === 'home' ? 80 : 0,
              opacity: activeKey === 'home' ? 1 : 0,
              marginLeft: activeKey === 'home' ? 5 : 0,
            }}
          >
            <span style={{...styles.labelText, color: activeKey === 'home' ? '#000' : '#fff'}}>Home</span>
          </span>
        </div>
        <div
          style={{
            ...styles.btn,
            border: activeKey === 'join' ? '1px solid #ffffff' : '1px solid transparent',
            backgroundColor: activeKey === 'join' ? '#fff' : 'transparent',
            color: activeKey === 'join' ? '#000' : '#fff'
          }}
          onClick={() => history.push('/join')}
          onMouseEnter={() => activate('join')}
          onMouseLeave={deactivate}
          onFocus={() => activate('join')}
          onBlur={deactivate}
          onTouchStart={() => touchActivate('join')}
          tabIndex={0}
        >
          <IonIcon icon={list} style={{ width: 20, height: 20 }} />
          <span
            style={{
              ...styles.labelWrap,
              maxWidth: activeKey === 'join' ? 80 : 0,
              opacity: activeKey === 'join' ? 1 : 0,
              marginLeft: activeKey === 'join' ? 6 : 0,
            }}
          >
            <span style={{...styles.labelText, color: activeKey === 'join' ? '#000' : '#fff'}}>Join</span>
          </span>
        </div>
        <div
          style={{
            ...styles.btn,
            border: activeKey === 'dashboard' ? '1px solid #ffffff' : '1px solid transparent',
            backgroundColor: activeKey === 'dashboard' ? '#fff' : 'transparent',
            color: activeKey === 'dashboard' ? '#000' : '#fff',
          }}
          onClick={() => history.push('/dashboard')}
          onMouseEnter={() => activate('dashboard')}
          onMouseLeave={deactivate}
          onFocus={() => activate('dashboard')}
          onBlur={deactivate}
          onTouchStart={() => touchActivate('dashboard')}
          tabIndex={0}
        >
          <IonIcon icon={personCircle} style={{ width: 20, height: 20 }} />
          <span
            style={{
              ...styles.labelWrap,
              maxWidth: activeKey === 'dashboard' ? 90 : 0,
              opacity: activeKey === 'dashboard' ? 1 : 0,
              marginLeft: activeKey === 'dashboard' ? 6 : 0,
            }}
          >
            <span style={{...styles.labelText, color: activeKey === 'dashboard' ? '#000' : '#fff'}}>Dashboard</span>
          </span>
        </div>
        <div
          style={{
            ...styles.btn,
            border: activeKey === 'global' ? '1px solid #ffffff' : '1px solid transparent',
            backgroundColor: activeKey === 'global' ? '#fff' : 'transparent',
            color: activeKey === 'global' ? '#000' : '#fff',
          }}
          onClick={() => history.push('/leaderboard/global')}
          onMouseEnter={() => activate('global')}
          onMouseLeave={deactivate}
          onFocus={() => activate('global')}
          onBlur={deactivate}
          onTouchStart={() => touchActivate('global')}
          tabIndex={0}
        >
          <IonIcon icon={globe} style={{ width: 20, height: 20 }} />
          <span
            style={{
              ...styles.labelWrap,
              maxWidth: activeKey === 'global' ? 80 : 0,
              opacity: activeKey === 'global' ? 1 : 0,
              marginLeft: activeKey === 'global' ? 6 : 0,
            }}
          >
            <span style={{...styles.labelText, color: activeKey === 'global' ? '#000' : '#fff'}}>Global</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default FloatingNav;
