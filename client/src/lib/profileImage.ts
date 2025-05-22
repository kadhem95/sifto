import { auth, db, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from "firebase/firestore";
import { updateProfile } from 'firebase/auth';

/**
 * Gestore centralizzato per il caricamento e la gestione delle immagini di profilo
 * Questa utility garantisce che l'immagine venga caricata e salvata in modo consistente
 * in tutta l'applicazione, sia in Firebase Auth che in Firestore.
 */
export async function uploadProfileImage(file: File): Promise<string | null> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("Nessun utente autenticato per caricare l'immagine");
      return null;
    }

    // Prepara il nome file univoco con userId e timestamp
    const userId = currentUser.uid;
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `profile_${userId}_${timestamp}.${fileExt}`;
    const filePath = `profile_images/${fileName}`;

    console.log(`Caricamento immagine: ${fileName} (${file.size / 1024} KB)`);

    // 1. Carica l'immagine su Firebase Storage
    const storageRef = ref(storage, filePath);
    const uploadResult = await uploadBytes(storageRef, file);
    console.log(`Immagine caricata: ${uploadResult.metadata.fullPath}`);

    // 2. Ottieni l'URL pubblico dell'immagine
    const downloadURL = await getDownloadURL(storageRef);
    console.log(`URL immagine: ${downloadURL}`);

    // 3. Aggiorna il profilo utente in Firebase Auth
    await updateProfile(currentUser, {
      photoURL: downloadURL
    });
    console.log("Profilo Auth aggiornato con nuova immagine");

    // 4. Aggiorna il profilo utente in Firestore
    await updateFirestoreProfile(userId, downloadURL);
    console.log("Profilo Firestore aggiornato con nuova immagine");

    return downloadURL;
  } catch (error) {
    console.error("Errore nel caricamento dell'immagine:", error);
    return null;
  }
}

/**
 * Aggiorna il profilo utente in Firestore con la nuova immagine
 */
async function updateFirestoreProfile(userId: string, photoURL: string): Promise<void> {
  try {
    // Cerca il documento utente esistente
    const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
    const userSnapshot = await getDocs(userQuery);

    if (!userSnapshot.empty) {
      // Aggiorna il documento esistente
      const userDoc = userSnapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        photoURL,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Se non esiste, crea un nuovo documento utente
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      await addDoc(collection(db, 'users'), {
        uid: userId,
        displayName: currentUser.displayName || 'Utente',
        email: currentUser.email || '',
        photoURL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rating: 0,
        reviewCount: 0
      });
    }
  } catch (error) {
    console.error("Errore nell'aggiornamento del profilo in Firestore:", error);
    throw error;
  }
}