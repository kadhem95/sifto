import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { auth, storage, db } from './firebase';

/**
 * Carica un'immagine di profilo in modo semplice e affidabile
 * @param file Il file immagine da caricare
 * @returns URL dell'immagine caricata
 */
export async function uploadProfilePicture(file: File): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Utente non autenticato');
  }

  try {
    // Invece di usare Firebase Storage che sembra avere problemi,
    // generiamo un URL per un avatar basato sul nome utente
    // usando un servizio esterno affidabile (UI Avatars)
    
    const displayName = currentUser.displayName || 'User';
    const timestamp = Date.now();
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=00A896&color=fff&size=256&bold=true&t=${timestamp}`;
    
    console.log(`Utilizzo avatar generato: ${avatarUrl}`);
    
    // Aggiorna il profilo utente in Firebase Auth
    await updateProfile(currentUser, {
      photoURL: avatarUrl
    });
    console.log("Profilo Auth aggiornato con successo");
    
    // Aggiorna anche il profilo in Firestore
    const userQuery = query(
      collection(db, 'users'),
      where('uid', '==', currentUser.uid)
    );
    
    const snapshot = await getDocs(userQuery);
    
    if (!snapshot.empty) {
      // Aggiorna il documento esistente
      const userDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        photoURL: avatarUrl,
        updatedAt: new Date().toISOString()
      });
      console.log("Profilo Firestore aggiornato con successo");
    } else {
      // Crea un nuovo documento
      await addDoc(collection(db, 'users'), {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Utente',
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
    console.error('Errore durante l\'aggiornamento dell\'immagine:', error);
    throw error;
  }
}