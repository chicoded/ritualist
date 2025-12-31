import React, { useState, useEffect } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonButtons, IonBackButton, IonSegment, IonSegmentButton, IonLabel,
  IonList, IonItem, IonInput, IonButton, IonIcon, IonModal,
  IonCard, IonCardContent, IonText, IonToggle, IonSelect, IonSelectOption,
  IonToast, IonAlert
} from '@ionic/react';
import { trash, add, pencil } from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Question {
  id: number;
  question_text: string;
  options: string[];
  correct_answer_index: number;
  image_url?: string;
  imageUrl?: string;
}

const EditRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [segment, setSegment] = useState('questions');
  
  // Room State
  const [title, setTitle] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [isPublic, setIsPublic] = useState(true);
  const [startTime, setStartTime] = useState('');
  
  // Questions State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // New Question Form
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  const [toast, setToast] = useState({ show: false, message: '' });
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const history = useHistory();

  useEffect(() => {
    fetchRoomDetails();
    fetchQuestions();
  }, [id]);

  const fetchRoomDetails = async () => {
    try {
      const res = await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/rooms/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTitle(data.room.title);
        setMaxParticipants(data.room.max_participants);
        setTimePerQuestion(data.room.time_per_question);
        setIsPublic(!!data.room.is_public);
        if (data.room.start_time) {
          const localInput = data.room.start_time.replace(' ', 'T').slice(0, 16);
          setStartTime(localInput);
        }
      }
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'Failed to load room details' });
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/questions/room/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRoom = async () => {
    try {
      const res = await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/rooms/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          title, 
          maxParticipants, 
          timePerQuestion, 
          isPublic,
          startTime: startTime ? `${startTime}:00`.replace('T', ' ') : null
        })
      });
      const data = await res.json();
      if (data.success) {
        setToast({ show: true, message: 'Settings updated!' });
      }
    } catch (err) {
      setToast({ show: true, message: 'Failed to update settings' });
    }
  };

  const handleDeleteRoom = async () => {
    try {
      const res = await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/rooms/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setToast({ show: true, message: 'Room deleted successfully' });
        history.push('/dashboard');
      } else {
        setToast({ show: true, message: data.message || 'Failed to delete room' });
      }
    } catch (err) {
      setToast({ show: true, message: 'Network error' });
    }
  };
  
  const handleAddQuestion = async () => {
    // Basic validation
    if (!newQuestionText || newOptions.some(o => !o)) {
      setToast({ show: true, message: 'Please fill all fields' });
      return;
    }

    try {
      let uploadedUrl: string | null = null;
      if (newImageFile) {
        const form = new FormData();
        form.append('image', newImageFile);
        const upRes = await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/upload/question-image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: form
        });
        const upData = await upRes.json();
        if (upData?.success && upData?.url) {
          uploadedUrl = upData.url;
        }
      }

      const res = await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/questions/room/${id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          questionText: newQuestionText, 
          options: newOptions, 
          correctAnswerIndex: newCorrectIndex,
          imageUrl: uploadedUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setQuestions([...questions, data.question]);
        setShowModal(false);
        setNewQuestionText('');
        setNewOptions(['', '', '', '']);
        setNewCorrectIndex(0);
        setNewImageFile(null);
        setToast({ show: true, message: 'Question added!' });
      }
    } catch (err) {
      setToast({ show: true, message: 'Failed to add question' });
    }
  };

  const handleDeleteQuestion = async (qId: number) => {
    try {
      const res = await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/questions/${qId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setQuestions(questions.filter(q => q.id !== qId));
        setToast({ show: true, message: 'Question deleted' });
      }
    } catch (err) {
      setToast({ show: true, message: 'Failed to delete question' });
    }
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...newOptions];
    updated[index] = value;
    setNewOptions(updated);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/dashboard" /></IonButtons>
          <IonTitle>Edit Quiz</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={segment} onIonChange={e => setSegment(e.detail.value as string)}>
            <IonSegmentButton value="questions"><IonLabel>Questions</IonLabel></IonSegmentButton>
            <IonSegmentButton value="settings"><IonLabel>Settings</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {segment === 'settings' ? (
          <div className="space-y-4">
            <IonItem>
              <IonLabel position="stacked">Title</IonLabel>
              <IonInput value={title} onIonChange={e => setTitle(e.detail.value!)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Max Participants</IonLabel>
              <IonInput type="number" value={maxParticipants} onIonChange={e => setMaxParticipants(parseInt(e.detail.value!, 10))} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Time Per Question (seconds)</IonLabel>
              <IonInput 
                type="number" 
                value={timePerQuestion} 
                onIonChange={e => setTimePerQuestion(parseInt(e.detail.value!, 10))} 
              />
            </IonItem>


            <IonItem>
              <IonLabel>Public Room</IonLabel>
              <IonToggle checked={isPublic} onIonChange={e => setIsPublic(e.detail.checked)} />
            </IonItem>
            <IonButton expand="block" onClick={handleUpdateRoom}>Save Settings</IonButton>
            
            
            <IonButton 
              expand="block" 
              color="danger" 
              className="mt-8"
              onClick={() => setShowDeleteAlert(true)}
            >
              Delete Quiz Room
            </IonButton>
          </div>
        ) : (
          <div className="space-y-4">
            <IonButton expand="block" onClick={() => setShowModal(true)}>
              <IonIcon icon={add} slot="start" /> Add Question
            </IonButton>
            {/* Start time and publish controls under Questions section */}
            {!isPublic && (
              <>
                <IonItem>
                  <IonLabel position="stacked">Start Time (Optional)</IonLabel>
                  <IonInput 
                    type="datetime-local" 
                    value={startTime} 
                    onIonChange={e => setStartTime(e.detail.value!)} 
                  />
                </IonItem>
                <IonButton expand="block" onClick={handleUpdateRoom}>Save Start Time</IonButton>
              </>
            )}
            {isPublic && (
              <IonButton 
                expand="block" 
                color="success"
                onClick={async () => {
                  try {
                    const res = await fetch(`https://preprimary-chau-unmelodised.ngrok-free.dev/api/rooms/publish/${id}`, {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                      }
                    });
                    const data = await res.json();
                    if (data.success) setToast({ show: true, message: 'Room published!' });
                    else setToast({ show: true, message: data.message || 'Failed to publish room' });
                  } catch (err) {
                    setToast({ show: true, message: 'Network error' });
                  }
                }}
              >
                Publish Room
              </IonButton>
            )}
            
            {questions.map((q, idx) => (
              <IonCard key={q.id}>
                <IonCardContent>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg mb-2">Q{idx + 1}: {q.question_text}</h3>
                      {((q as any).image_url || (q as any).imageUrl) && (
                        <img
                          src={(() => {
                            const raw = (q as any).image_url || (q as any).imageUrl;
                            return typeof raw === 'string' && raw.startsWith('/uploads') ? `https://preprimary-chau-unmelodised.ngrok-free.dev${raw}` : raw;
                          })()}
                          alt="Question"
                          className="mb-3 max-h-48 object-contain border rounded"
                        />
                      )}
                      <ul className="list-disc pl-5">
                        {q.options.map((opt, i) => (
                          <li key={i} className={i === q.correct_answer_index ? 'text-green-600 font-semibold' : ''}>
                            {opt}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <IonButton fill="clear" color="danger" onClick={() => handleDeleteQuestion(q.id)}>
                      <IonIcon icon={trash} />
                    </IonButton>
                  </div>
                </IonCardContent>
              </IonCard>
            ))}
          </div>
        )}

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Add Question</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Question Text</IonLabel>
              <IonInput value={newQuestionText} onIonChange={e => setNewQuestionText(e.detail.value!)} />
            </IonItem>
            <IonItem className="mt-2">
              <IonLabel position="stacked">Image (optional)</IonLabel>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setNewImageFile(e.target.files?.[0] || null)}
              />
            </IonItem>
            
            <div className="mt-4">
              <IonLabel className="ml-4 text-sm text-gray-500">Options</IonLabel>
              {newOptions.map((opt, i) => (
                <IonItem key={i}>
                  <IonLabel slot="start">{i + 1}</IonLabel>
                  <IonInput 
                    placeholder={`Option ${i + 1}`}
                    value={opt} 
                    onIonChange={e => updateOption(i, e.detail.value!)} 
                  />
                </IonItem>
              ))}
            </div>

            <IonItem className="mt-4">
              <IonLabel position="stacked">Correct Answer</IonLabel>
              <IonSelect value={newCorrectIndex} onIonChange={e => setNewCorrectIndex(e.detail.value)}>
                {newOptions.map((_, i) => (
                  <IonSelectOption key={i} value={i}>Option {i + 1}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            <div className="ion-padding mt-4">
              <IonButton expand="block" onClick={handleAddQuestion}>Add Question</IonButton>
            </div>
          </IonContent>
        </IonModal>

        <IonToast 
          isOpen={toast.show} 
          onDidDismiss={() => setToast({ ...toast, show: false })} 
          message={toast.message} 
          duration={2000} 
        />

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header={'Delete Room'}
          message={'Are you sure you want to delete this room? This action cannot be undone.'}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => setShowDeleteAlert(false)
            },
            {
              text: 'Delete',
              role: 'destructive',
              handler: handleDeleteRoom
            }
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default EditRoom;
