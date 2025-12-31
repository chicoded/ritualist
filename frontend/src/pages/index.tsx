import React from "react";
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';

const Index: React.FC = () => {
  
    return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Index</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>Welcome to the Index Page!</p>
      </IonContent>
    </IonPage>
  );
};

export default Index;