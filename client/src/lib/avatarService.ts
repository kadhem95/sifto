import { auth, db } from './firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from "firebase/firestore";
import { updateProfile } from 'firebase/auth';

/**
 * Servizio centralizzato per la gestione delle immagini di profilo
 * Utilizza UI Avatars come sistema affidabile per generare avatar
 * basati sul nome dell'utente
 */

/**
 * Genera un URL per un avatar basato sul nome utente
 * @param displayName Nome da utilizzare per generare l'avatar
 * @returns URL dell'avatar generato
 */
export function generateAvatarUrl(displayName: string = 'User'): string {
  // Usiamo un timestamp per evitare problemi di cache
  const timestamp = Date.now();
  const name = encodeURIComponent(displayName.trim() || 'User');
  const bgColor = '00A896'; // Colore primario dell'app
  return `https://ui-avatars.com/api/?name=${name}&background=${bgColor}&color=fff&size=256&bold=true&t=${timestamp}`;
}

/**
 * Aggiorna il profilo dell'utente con un nuovo avatar generato
 * @param forceRefresh Se true, genera un nuovo avatar anche se l'utente ha già un'immagine
 * @returns URL dell'avatar aggiornato o null in caso di errore
 */
export async function updateUserAvatar(forceRefresh: boolean = false): Promise<string | null> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("Impossibile aggiornare l'avatar: nessun utente autenticato");
      return null;
    }

    const userId = currentUser.uid;
    const displayName = currentUser.displayName || 'User';
    
    // Se l'utente ha già un avatar e non è richiesto un refresh forzato, usiamo quello esistente
    if (currentUser.photoURL && !forceRefresh && !currentUser.photoURL.includes('ui-avatars.com')) {
      console.log("L'utente ha già un'immagine personalizzata, mantenuta");
      return currentUser.photoURL;
    }
    
    // Generiamo un nuovo avatar
    const avatarUrl = generateAvatarUrl(displayName);
    console.log(`Nuovo avatar generato per ${displayName}: ${avatarUrl}`);
    
    // Aggiorniamo il profilo in Firebase Auth
    await updateProfile(currentUser, {
      photoURL: avatarUrl
    });
    console.log("Profilo Auth aggiornato con nuovo avatar");
    
    // Aggiorniamo anche il profilo in Firestore
    try {
      const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        // Aggiorniamo il documento esistente
        const userDoc = userSnapshot.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), {
          photoURL: avatarUrl,
          updatedAt: new Date().toISOString()
        });
        console.log(`Profilo Firestore aggiornato con nuovo avatar: ${userDoc.id}`);
      } else {
        // Creiamo un nuovo profilo utente
        await addDoc(collection(db, 'users'), {
          uid: userId,
          displayName: displayName,
          email: currentUser.email,
          photoURL: avatarUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rating: 0,
          reviewCount: 0
        });
        console.log("Nuovo profilo utente creato in Firestore con avatar");
      }
    } catch (firestoreError) {
      console.error("Errore nell'aggiornamento Firestore:", firestoreError);
      // Non blocchiamo il processo per errori Firestore
    }
    
    return avatarUrl;
  } catch (error) {
    console.error("Errore durante l'aggiornamento dell'avatar:", error);
    return null;
  }
}

/**
 * Assicura che l'utente abbia sempre un'immagine profilo valida
 * Da chiamare all'avvio dell'app o dopo il login
 */
export async function ensureUserHasAvatar(): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    // Se l'utente non ha un'immagine profilo, ne generiamo una
    if (!currentUser.photoURL) {
      console.log("Utente senza immagine profilo, generazione automatica");
      await updateUserAvatar();
    }
  } catch (error) {
    console.error("Errore nel controllo dell'avatar:", error);
  }
}