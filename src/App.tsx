import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from '@/pages/Home';
import Login from '@/components/LoginModal';
import Register from '@/pages/Register';
import CreateRoom from '@/pages/CreateRoom';
import Dashboard from '@/pages/Dashboard';
import EditRoom from '@/pages/EditRoom';
import JoinQuiz from '@/pages/JoinQuiz';
import RoomLobby from '@/pages/RoomLobby';
import QuizGame from '@/pages/QuizGame';
import GlobalLeaderboard from '@/pages/GlobalLeaderboard';
import Profile from '@/pages/Profile';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import FloatingNav from '@/components/FloatingNav';
import { useLocation } from 'react-router-dom';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
/* import './theme/variables.css'; */

setupIonicReact();

const PrivateRoute: React.FC<{ path: string; component: React.FC; exact?: boolean }> = ({ path, component: Component, exact }) => {
  const { isAuthenticated } = useAuth();
  return (
    <Route
      path={path}
      exact={exact}
      render={(props) => (isAuthenticated ? <Component /> : <Redirect to="/" />)}
    />
  );
};

const AppRoutes: React.FC = () => {
  return (
    <IonRouterOutlet>
      <Route exact path="/login" component={Login} />
      <Route exact path="/register" component={Register} />
      <Route exact path="/home" component={Home} />
      <PrivateRoute exact path="/dashboard" component={Dashboard} />
      <PrivateRoute exact path="/create-room" component={CreateRoom} />
      <PrivateRoute exact path="/room/edit/:id" component={EditRoom} />
      <PrivateRoute exact path="/join" component={JoinQuiz} />
      <PrivateRoute exact path="/lobby/:id" component={RoomLobby} />
      <PrivateRoute exact path="/game/:id" component={QuizGame} />
      <PrivateRoute exact path="/leaderboard/global" component={GlobalLeaderboard} />
      <PrivateRoute exact path="/profile" component={Profile} />
      <Route exact path="/">
        <Redirect to="/home" />
      </Route>
    </IonRouterOutlet>
  );
};

const NavHost: React.FC = () => {
  const location = useLocation();
  const allowed = ['/home', '/join', '/dashboard', '/leaderboard/global'];
  const path = location.pathname;
  const showNav = allowed.some(a => path.startsWith(a));
  return showNav ? <FloatingNav /> : null;
};

const DeviceGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isCoarse = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobileUA = /(Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile)/i.test(ua);
  const isMobile = isCoarse || isMobileUA;
  if (!isMobile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000', color: '#fff', textAlign: 'center', padding: 16 }}>
        <div style={{ maxWidth: 480 }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Mobile Device Required</div>
          <div style={{ fontSize: 14 }}>Please access this app from a mobile device.</div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const App: React.FC = () => (
  <IonApp>
    <AuthProvider>
      <IonReactRouter>
        <DeviceGate>
          <AppRoutes />
          <NavHost />
        </DeviceGate>
      </IonReactRouter>
    </AuthProvider>
  </IonApp>
);

export default App;
