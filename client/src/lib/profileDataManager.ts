import { auth, db } from './firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { generateAvatarUrl } from './avatarManager';

/**
 * Tipo per i dati del profilo utente recuperati
 */
export interface UserProfileData {
  id?: string;
  uid: string;
  displayName: string;
  email?: string | null;
  photoURL?: string | null;
  createdAt: string;
  updatedAt?: string;
  rating?: number;
  reviewCount?: number;
}

/**
 * Ottiene i dati del profilo utente da Firestore in modo sicuro
 * Gestisce gli errori e assicura sempre un risultato valido
 */
export async function getUserProfileData(userId: string): Promise<UserProfileData> {
  try {
    console.log(`Recupero dati profilo per utente: ${userId}`);

    // Inizializziamo alcuni dati di base usando Firebase Auth se disponibile
    let basicUserData: Partial<UserProfileData> = {
      uid: userId,
      displayName: 'Utente'
    };

    // Cerchiamo di ottenere i dati da Firebase Auth se è l'utente corrente
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === userId) {
      console.log(`Ottenuti dati da Firebase Auth: ${currentUser.displayName}`);
      basicUserData = {
        uid: userId,
        displayName: currentUser.displayName || 'Utente',
        email: currentUser.email,
        photoURL: currentUser.photoURL
      };
    }

    // Cerchiamo di ottenere i dati da Firestore
    try {
      const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        const userDocId = userSnapshot.docs[0].id;
        
        console.log(`Ottenuti dati da Firestore: ${userData.displayName}`);
        
        // Combiniamo i dati di Firestore con quelli di base (preferendo Firestore)
        return {
          id: userDocId,
          uid: userId,
          displayName: userData.displayName || basicUserData.displayName || 'Utente',
          email: userData.email || basicUserData.email,
          photoURL: userData.photoURL || basicUserData.photoURL,
          createdAt: userData.createdAt || new Date().toISOString(),
          updatedAt: userData.updatedAt,
          rating: userData.rating || 0,
          reviewCount: userData.reviewCount || 0
        };
      }
    } catch (firestoreError) {
      console.error('Errore nel recupero dati da Firestore:', firestoreError);
      // Continuiamo con i dati di base in caso di errore
    }

    // Se non abbiamo trovato dati in Firestore, creiamo un profilo di base
    console.log('Nessun profilo trovato in Firestore, creazione profilo di base');
    
    // Generiamo un avatar basato sul nome
    const displayName = basicUserData.displayName || 'Utente';
    const avatarUrl = basicUserData.photoURL || generateAvatarUrl(displayName);
    
    const profileData: UserProfileData = {
      uid: userId,
      displayName: displayName,
      email: basicUserData.email,
      photoURL: avatarUrl,
      createdAt: new Date().toISOString()
    };
    
    // Proviamo a salvare questo profilo in Firestore per uso futuro
    try {
      const newProfileRef = await addDoc(collection(db, 'users'), {
        ...profileData,
        updatedAt: profileData.createdAt,
        rating: 0,
        reviewCount: 0
      });
      
      console.log(`Creato nuovo profilo in Firestore: ${newProfileRef.id}`);
      profileData.id = newProfileRef.id;
    } catch (createError) {
      console.error('Errore nella creazione profilo:', createError);
      // Continuiamo anche in caso di errore
    }
    
    return profileData;
  } catch (error) {
    console.error('Errore generale nel recupero profilo:', error);
    
    // Restituiamo almeno un profilo minimo in caso di errore
    return {
      uid: userId,
      displayName: `Utente (${userId.slice(0, 6)})`,
      photoURL: generateAvatarUrl(`User ${userId.slice(0, 6)}`),
      createdAt: new Date().toISOString()
    };
  }
}

/**
 * Aggiorna i dati del profilo utente in Firestore e Auth
 */
export async function updateUserProfile(
  userData: Partial<UserProfileData>
): Promise<UserProfileData | null> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('Nessun utente autenticato per aggiornare il profilo');
      return null;
    }
    
    const userId = currentUser.uid;
    console.log(`Aggiornamento profilo per utente: ${userId}`);
    
    // Aggiorniamo prima Firebase Auth
    if (currentUser && (userData.displayName || userData.photoURL)) {
      try {
        // Utilizziamo updateProfile da firebase/auth
        const { updateProfile } = await import('firebase/auth');
        await updateProfile(currentUser, {
          displayName: userData.displayName,
          photoURL: userData.photoURL
        });
        console.log('Profilo Auth aggiornato');
      } catch (authError) {
        console.error('Errore aggiornamento Auth:', authError);
      }
    }
    
    // Poi aggiorniamo Firestore
    try {
      const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
      const userSnapshot = await getDocs(userQuery);
      
      const updateData = {
        ...userData,
        updatedAt: new Date().toISOString()
      };
      
      if (!userSnapshot.empty) {
        // Aggiorniamo il documento esistente
        const userDoc = userSnapshot.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), updateData);
        console.log(`Profilo Firestore aggiornato: ${userDoc.id}`);
        
        // Otteniamo i dati aggiornati
        return await getUserProfileData(userId);
      } else {
        // Creiamo un nuovo documento se non esiste
        console.log('Creazione nuovo profilo Firestore');
        
        const newUserData = {
          uid: userId,
          displayName: currentUser.displayName || 'Utente',
          email: currentUser.email,
          photoURL: currentUser.photoURL,
          ...userData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rating: 0,
          reviewCount: 0
        };
        
        await addDoc(collection(db, 'users'), newUserData);
        console.log('Nuovo profilo Firestore creato');
        
        // Otteniamo i dati aggiornati
        return await getUserProfileData(userId);
      }
    } catch (firestoreError) {
      console.error('Errore aggiornamento Firestore:', firestoreError);
      return null;
    }
  } catch (error) {
    console.error('Errore generale aggiornamento profilo:', error);
    return null;
  }
}