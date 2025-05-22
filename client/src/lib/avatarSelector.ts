import { updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * Genera un avatar personalizzato con colore specifico
 * @param userId ID utente 
 * @param userName Nome utente
 * @param colorIndex Indice del colore (0-4)
 */
export async function setCustomColorAvatar(userId: string, userName: string, colorIndex: number = 0): Promise<string> {
  try {
    // Array di colori piacevoli
    const colors = [
      '00A896', // Verde acqua
      '05668D', // Blu
      'F0A202', // Giallo
      'F18701', // Arancione
      'D95D39'  // Rosso
    ];
    
    // Uso un indice valido
    const safeIndex = colorIndex % colors.length;
    const selectedColor = colors[safeIndex];
    
    // Creazione dell'URL per l'avatar
    const timestamp = Date.now();
    const name = encodeURIComponent(userName || 'User');
    const avatarUrl = `https://ui-avatars.com/api/?name=${name}&background=${selectedColor}&color=fff&size=256&bold=true&t=${timestamp}`;
    
    console.log(`Generato avatar con colore ${selectedColor} per ${userName}`);
    
    // Aggiorno profilo in Firebase Auth
    const currentUser = auth.currentUser;
    if (currentUser) {
      await updateProfile(currentUser, {
        photoURL: avatarUrl
      });
      console.log('Profilo Auth aggiornato');
    }
    
    // Aggiorno profilo in Firestore
    await updateFirestoreProfile(userId, avatarUrl, userName);
    console.log('Profilo Firestore aggiornato');
    
    return avatarUrl;
  } catch (error) {
    console.error('Errore generazione avatar:', error);
    throw error;
  }
}

/**
 * Imposta un avatar con un colore casuale
 */
export async function setRandomColorAvatar(userId: string, userName: string): Promise<string> {
  const randomIndex = Math.floor(Math.random() * 5); // 0-4
  return setCustomColorAvatar(userId, userName, randomIndex);
}

/**
 * Aggiorna il profilo utente in Firestore
 */
export async function updateFirestoreProfile(userId: string, photoURL: string, displayName?: string): Promise<void> {
  try {
    const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
    const snapshot = await getDocs(userQuery);
    
    const updateData: any = {
      photoURL,
      updatedAt: new Date().toISOString()
    };
    
    // Se abbiamo un nome display, aggiungiamolo
    if (displayName) {
      updateData.displayName = displayName;
    }
    
    if (!snapshot.empty) {
      // Aggiorna profilo esistente
      const userDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), updateData);
    } else {
      // Crea nuovo profilo
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      await addDoc(collection(db, 'users'), {
        uid: userId,
        displayName: displayName || currentUser.displayName || 'Utente',
        email: currentUser.email,
        photoURL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rating: 0,
        reviewCount: 0
      });
    }
  } catch (error) {
    console.error('Errore aggiornamento Firestore:', error);
  }
}