import React, { useState, useEffect } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonSpinner, IonIcon, IonFab, IonFabButton
} from '@ionic/react';
import { add } from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import { useHistory } from 'react-router-dom';

interface Room {
  id: number;
  room_code: string;
  title: string;
  max_participants: number;
  status: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();
  const history = useHistory();

  useEffect(() => {
    fetchMyRooms();
  }, []);

  const fetchMyRooms = async () => {
    try {
      const response = await fetch('https://preprimary-chau-unmelodised.ngrok-free.dev/api/rooms/my-rooms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Quiz Rooms</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="container mx-auto">
          {loading ? (
            <div className="text-center mt-10"><IonSpinner /></div>
          ) : rooms.length === 0 ? (
            <div className="text-center mt-10">
              <p className="text-gray-500 mb-4">You haven't created any rooms yet.</p>
              <IonButton routerLink="/create-room">Create First Room</IonButton>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map(room => (
                <IonCard key={room.id} className="cursor-pointer" onClick={() => history.push(`/room/edit/${room.id}`)}>
                  <IonCardHeader>
                    <IonCardTitle>{room.title}</IonCardTitle>
                    <IonCardSubtitle>Code: {room.room_code}</IonCardSubtitle>
                  </IonCardHeader>
                  <div className="ion-padding-horizontal ion-padding-bottom">
                    <p className="text-sm text-gray-600">Status: {room.status}</p>
                    <p className="text-sm text-gray-600">Participants: {room.max_participants}</p>
                  </div>
                </IonCard>
              ))}
            </div>
          )}
        </div>
        
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton routerLink="/create-room">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;
