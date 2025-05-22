import { auth, db } from './firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from "firebase/firestore";
import { updateProfile } from 'firebase/auth';

/**
 * Funzione che genera un URL per un avatar basato sul nome dell'utente
 * usando un servizio di generazione avatar esterno (UI Avatars)
 */
export function generateAvatarUrl(displayName: string): string {
  const timestamp = Date.now(); // Aggiunto per evitare la cache del browser
  const name = encodeURIComponent(displayName || 'User');
  const bgColor = '00A896'; // Colore di sfondo coerente con il tema dell'app
  return `https://ui-avatars.com/api/?name=${name}&background=${bgColor}&color=fff&size=256&bold=true&t=${timestamp}`;
}

/**
 * Aggiorna l'immagine del profilo dell'utente usando un servizio di generazione avatar esterno
 * È una soluzione di fallback quando Storage non funziona
 */
export async function updateProfileWithGeneratedAvatar(): Promise<string | null> {
  try {
    // Verifico che esista un utente autenticato
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("Nessun utente autenticato");
      return null;
    }

    const userId = currentUser.uid;
    const displayName = currentUser.displayName || 'User';
    
    // Generiamo un URL per l'avatar basato sul nome
    const avatarUrl = generateAvatarUrl(displayName);
    console.log(`Avatar generato per ${displayName}: ${avatarUrl}`);
    
    // Aggiorniamo Firebase Auth
    await updateProfile(currentUser, {
      photoURL: avatarUrl
    });
    console.log("Profilo Auth aggiornato con avatar generato");
    
    // Aggiorniamo anche Firestore
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uid", "==", userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Aggiorniamo il documento esistente
        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, "users", userDoc.id), {
          photoURL: avatarUrl,
          updatedAt: new Date().toISOString()
        });
        console.log(`Profilo Firestore aggiornato con avatar generato: ${userDoc.id}`);
      } else {
        // Creiamo un nuovo profilo
        await addDoc(collection(db, "users"), {
          uid: userId,
          displayName: displayName,
          email: currentUser.email,
          photoURL: avatarUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rating: 0,
          reviewCount: 0
        });
        console.log("Nuovo profilo utente creato in Firestore con avatar generato");
      }
    } catch (firestoreError) {
      console.error("Errore nell'aggiornamento Firestore:", firestoreError);
    }
    
    return avatarUrl;
  } catch (error) {
    console.error("Errore durante l'aggiornamento del profilo con avatar:", error);
    return null;
  }
}

/**
 * Assicura che l'utente abbia sempre un'immagine profilo
 * Da utilizzare quando serve forzare la presenza di un'immagine
 */
export async function ensureUserHasProfileImage(): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    // Se l'utente non ha un'immagine o ha un problema con l'immagine esistente
    if (!currentUser.photoURL) {
      console.log("Utente senza immagine profilo, generazione automatica");
      await updateProfileWithGeneratedAvatar();
    }
  } catch (error) {
    console.error("Errore nel controllo dell'immagine profilo:", error);
  }
}