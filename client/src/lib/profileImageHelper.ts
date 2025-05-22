import { storage, auth, db } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from "firebase/firestore";

/**
 * Carica l'immagine di profilo dell'utente su Firebase Storage
 * e aggiorna sia Firebase Auth che Firestore con l'URL dell'immagine
 */
export async function uploadUserProfileImage(file: File): Promise<string | null> {
  try {
    // Verifico che esista un utente autenticato
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("Nessun utente autenticato");
      return null;
    }

    const userId = currentUser.uid;
    console.log(`Caricamento immagine per l'utente: ${userId}`);

    // 1. Creazione dell'oggetto StorageReference con nome file univoco
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `profile_${userId}_${timestamp}.${fileExtension}`;
    const storageRef = ref(storage, `profile_images/${fileName}`);
    
    console.log(`Riferimento storage creato: ${fileName}`);
    
    // 2. Caricamento del file su Firebase Storage
    const uploadResult = await uploadBytes(storageRef, file);
    console.log(`File caricato con successo: ${uploadResult.metadata.name}`);
    
    // 3. Ottenimento dell'URL pubblico dell'immagine
    const downloadURL = await getDownloadURL(storageRef);
    console.log(`URL pubblico ottenuto: ${downloadURL}`);
    
    // 4. Aggiornamento del profilo in Firebase Auth
    await updateProfile(currentUser, {
      photoURL: downloadURL
    });
    console.log("Profilo Auth aggiornato con successo");
    
    // 5. Aggiornamento del profilo in Firestore
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uid", "==", userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Aggiornamento di un documento esistente
        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, "users", userDoc.id), {
          photoURL: downloadURL,
          updatedAt: new Date().toISOString()
        });
        console.log(`Profilo Firestore aggiornato: ${userDoc.id}`);
      } else {
        // Creazione di un nuovo documento utente
        await addDoc(collection(db, "users"), {
          uid: userId,
          displayName: currentUser.displayName || "Utente",
          email: currentUser.email,
          photoURL: downloadURL,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rating: 0,
          reviewCount: 0
        });
        console.log("Nuovo profilo utente creato in Firestore");
      }
    } catch (firestoreError) {
      console.error("Errore nell'aggiornamento Firestore:", firestoreError);
      // Non blocchiamo il processo, l'immagine è stata caricata
    }
    
    return downloadURL;
  } catch (error) {
    console.error("Errore durante il caricamento dell'immagine:", error);
    return null;
  }
}