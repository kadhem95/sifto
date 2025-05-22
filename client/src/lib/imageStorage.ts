import { auth, db, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from "firebase/firestore";

/**
 * Carica un'immagine su Firebase Storage e aggiorna i profili utente
 * @param file File da caricare
 * @returns URL dell'immagine caricata o null in caso di errore
 */
export async function uploadProfileImage(file: File): Promise<string | null> {
  try {
    // Verifica presenza utente autenticato
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("Nessun utente autenticato");
      return null;
    }

    console.log(`Avvio caricamento immagine profilo per ${currentUser.displayName || currentUser.email}`);
    
    // 1. Genera un nome file univoco
    const userId = currentUser.uid;
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `profile_${userId}_${timestamp}.${fileExtension}`;
    const storagePath = `profile_images/${fileName}`;
    
    console.log(`File: ${fileName} (${Math.round(file.size / 1024)} KB)`);
    console.log(`Percorso storage: ${storagePath}`);
    
    // 2. Carica su Firebase Storage
    const storageRef = ref(storage, storagePath);
    
    // Mostra il progresso e gestisce il caricamento
    console.log(`Inizio upload...`);
    const uploadResult = await uploadBytes(storageRef, file);
    console.log(`Upload completato: ${uploadResult.metadata.fullPath}`);
    
    // 3. Ottieni URL pubblico
    console.log(`Ottenimento URL pubblico...`);
    const downloadURL = await getDownloadURL(storageRef);
    console.log(`URL immagine ottenuto: ${downloadURL}`);
    
    // 4. Aggiorna il profilo utente in Firebase Auth
    console.log(`Aggiornamento profilo in Firebase Auth...`);
    await updateProfile(currentUser, {
      photoURL: downloadURL
    });
    console.log(`Profilo Auth aggiornato con successo`);
    
    // 5. Aggiorna il profilo utente in Firestore
    console.log(`Aggiornamento profilo in Firestore...`);
    
    try {
      // Cerca il documento utente esistente
      const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        // Se esiste, aggiornalo
        const userDoc = userSnapshot.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), {
          photoURL: downloadURL,
          updatedAt: new Date().toISOString()
        });
        console.log(`Profilo Firestore aggiornato: ${userDoc.id}`);
      } else {
        // Se non esiste, crealo
        const userData = {
          uid: userId,
          displayName: currentUser.displayName || 'Utente',
          email: currentUser.email,
          photoURL: downloadURL,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rating: 0,
          reviewCount: 0
        };
        
        const userDocRef = await addDoc(collection(db, 'users'), userData);
        console.log(`Nuovo profilo creato in Firestore: ${userDocRef.id}`);
      }
    } catch (firestoreError) {
      console.error(`Errore nell'aggiornamento Firestore:`, firestoreError);
      // Continuiamo anche in caso di errore con Firestore
    }
    
    console.log(`Processo di caricamento immagine completato con successo`);
    return downloadURL;
  } catch (error) {
    console.error(`Errore nel caricamento dell'immagine:`, error);
    return null;
  }
}

/**
 * Controlla che l'immagine del profilo sia valida
 * @param url URL dell'immagine da verificare
 * @returns true se l'immagine è valida, false altrimenti
 */
export function isValidImageUrl(url: string | null): boolean {
  if (!url) return false;
  
  // Verifica che l'URL sia valido
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Ottiene l'URL dell'immagine del profilo per un utente
 * @param userId ID dell'utente
 * @returns URL dell'immagine o null se non trovata
 */
export async function getProfileImageUrl(userId: string): Promise<string | null> {
  try {
    // Cerca prima in Firebase Auth (se è l'utente corrente)
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === userId && currentUser.photoURL) {
      return currentUser.photoURL;
    }
    
    // Altrimenti cerca in Firestore
    const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data();
      if (userData.photoURL) {
        return userData.photoURL;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Errore nel recupero dell'immagine profilo:`, error);
    return null;
  }
}