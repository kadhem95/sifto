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
    // 1. Crea un nome file univoco
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filename = `profile_${currentUser.uid}_${timestamp}.${fileExt}`;
    const path = `profile_images/${filename}`;
    
    console.log(`Caricamento immagine: ${path}`);
    
    // 2. Carica il file su Firebase Storage
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    
    // 3. Ottieni l'URL pubblico
    const downloadURL = await getDownloadURL(fileRef);
    console.log(`URL immagine: ${downloadURL}`);
    
    // 4. Aggiorna il profilo utente in Firebase Auth
    await updateProfile(currentUser, {
      photoURL: downloadURL
    });
    
    // 5. Aggiorna anche il profilo in Firestore
    const userQuery = query(
      collection(db, 'users'),
      where('uid', '==', currentUser.uid)
    );
    
    const snapshot = await getDocs(userQuery);
    
    if (!snapshot.empty) {
      // Aggiorna il documento esistente
      const userDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        photoURL: downloadURL,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Crea un nuovo documento
      await addDoc(collection(db, 'users'), {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Utente',
        email: currentUser.email,
        photoURL: downloadURL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rating: 0,
        reviewCount: 0
      });
    }
    
    return downloadURL;
  } catch (error) {
    console.error('Errore durante il caricamento dell\'immagine:', error);
    throw error;
  }
}