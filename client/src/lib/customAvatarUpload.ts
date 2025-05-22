import { updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * Genera un URL per un avatar personalizzato basato sul nome utente
 * @param name Nome dell'utente
 * @param bgColor Colore di sfondo (opzionale)
 * @returns URL dell'avatar generato
 */
export function generateCustomAvatar(name: string, bgColor?: string): string {
  // Generiamo un timestamp per evitare problemi di cache
  const timestamp = Date.now();
  
  // Impostiamo un colore di default o usiamo quello fornito
  const color = bgColor || '00A896';
  
  // Codifichiamo il nome per l'URL
  const encodedName = encodeURIComponent(name || 'User');
  
  // Generiamo l'URL dell'avatar
  return `https://ui-avatars.com/api/?name=${encodedName}&background=${color}&color=fff&size=256&bold=true&t=${timestamp}`;
}

/**
 * Aggiorna l'immagine del profilo utente con un avatar personalizzato
 * @param colorVariant Variante di colore (0-4)
 * @returns URL dell'avatar generato
 */
export async function updateUserAvatar(colorVariant: number = 0): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Utente non autenticato");
  }
  
  try {
    // Utilizziamo il nome utente o un valore di default
    const userName = currentUser.displayName || 'User';
    
    // Colori disponibili (combinazioni piacevoli e in linea con il tema dell'app)
    const colors = ['00A896', '05668D', 'F0A202', 'F18701', 'D95D39'];
    
    // Selezioniamo un colore in base alla variante
    const colorIndex = colorVariant % colors.length;
    const selectedColor = colors[colorIndex];
    
    // Generiamo l'URL dell'avatar
    const avatarUrl = generateCustomAvatar(userName, selectedColor);
    console.log(`Avatar generato per ${userName}: ${avatarUrl}`);
    
    // Aggiorniamo il profilo in Firebase Auth
    await updateProfile(currentUser, {
      photoURL: avatarUrl
    });
    console.log("Profilo Auth aggiornato con successo");
    
    // Aggiorniamo anche il profilo in Firestore
    const userQuery = query(
      collection(db, 'users'),
      where('uid', '==', currentUser.uid)
    );
    
    const snapshot = await getDocs(userQuery);
    
    if (!snapshot.empty) {
      // Aggiorniamo il documento esistente
      const userDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        photoURL: avatarUrl,
        updatedAt: new Date().toISOString()
      });
      console.log("Profilo Firestore aggiornato con successo");
    } else {
      // Creiamo un nuovo documento
      await addDoc(collection(db, 'users'), {
        uid: currentUser.uid,
        displayName: userName,
        email: currentUser.email,
        photoURL: avatarUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rating: 0,
        reviewCount: 0
      });
      console.log("Nuovo profilo utente creato con successo");
    }
    
    return avatarUrl;
  } catch (error) {
    console.error("Errore nell'aggiornamento dell'avatar:", error);
    throw error;
  }
}

/**
 * Imposta un colore casuale per l'avatar dell'utente
 * @returns URL dell'avatar con nuovo colore
 */
export async function randomizeAvatarColor(): Promise<string> {
  // Generazione di un indice di colore casuale (0-4)
  const randomColorIndex = Math.floor(Math.random() * 5);
  return updateUserAvatar(randomColorIndex);
}