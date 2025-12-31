import React, { useState } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonInput, IonButton, IonItem, IonLabel, IonToast, 
  IonLoading, IonToggle, IonButtons, IonBackButton 
} from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import { useHistory } from 'react-router-dom';

const CreateRoom: React.FC = () => {
  const [title, setTitle] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { token } = useAuth();
  const history = useHistory();

  const handleCreateRoom = async () => {
    if (!title) {
      setToastMessage('Title is required');
      setShowToast(true);
      return;
    }
    if (!isPublic && !password) {
      setToastMessage('Password is required for private rooms');
      setShowToast(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://preprimary-chau-unmelodised.ngrok-free.dev/api/rooms/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title, 
          maxParticipants, 
          timePerQuestion, 
          isPublic, 
          password: isPublic ? undefined : password
        }),
      });
      const data = await response.json();

      if (data.success) {
        setToastMessage('Room created successfully!');
        setShowToast(true);
        // Navigate to the room or dashboard
        // For now, let's go back home or to a room waiting page
        setTimeout(() => {
             history.push('/'); // Or `/room/${data.room.roomCode}` eventually
        }, 1000);
       
      } else {
        setToastMessage(data.message || 'Failed to create room');
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
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Create Quiz Room</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Room Title</IonLabel>
          <IonInput 
            value={title} 
            placeholder="e.g. Friday Night Trivia"
            onIonChange={e => setTitle(e.detail.value!)} 
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Max Participants</IonLabel>
          <IonInput 
            type="number" 
            value={maxParticipants} 
            onIonChange={e => setMaxParticipants(parseInt(e.detail.value!, 10))} 
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Time Per Question (seconds)</IonLabel>
          <IonInput 
            type="number" 
            value={timePerQuestion} 
            onIonChange={e => setTimePerQuestion(parseInt(e.detail.value!, 10))} 
          />
        </IonItem>

        <IonItem lines="none" className="ion-margin-top">
          <IonLabel>Public Room</IonLabel>
          <IonToggle 
            checked={isPublic} 
            onIonChange={e => setIsPublic(e.detail.checked)} 
          />
        </IonItem>

        {!isPublic && (
          <IonItem>
            <IonLabel position="stacked">Room Password</IonLabel>
            <IonInput 
              type="password" 
              value={password} 
              placeholder="Set a secret password"
              onIonChange={e => setPassword(e.detail.value!)} 
            />
          </IonItem>
        )}

        <div className="ion-padding-top ion-margin-top">
          <IonButton expand="block" onClick={handleCreateRoom}>
            Create Room
          </IonButton>
        </div>

        <IonLoading isOpen={loading} message={'Creating room...'} />
        <IonToast 
          isOpen={showToast} 
          onDidDismiss={() => setShowToast(false)} 
          message={toastMessage} 
          duration={2000} 
        />
      </IonContent>
    </IonPage>
  );
};

export default CreateRoom;
