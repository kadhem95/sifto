import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { auth, storage, db } from './firebase';

/**
 * Carica un'immagine di profilo su Firebase Storage
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
    
    console.log(`⬆️ Caricamento immagine su Storage: ${path}`);
    
    // 2. Carica il file su Firebase Storage
    const fileRef = ref(storage, path);
    
    try {
      // Tentativo di caricamento su Firebase Storage
      await uploadBytes(fileRef, file);
      console.log(`✅ Upload completato su Storage`);
      
      // Ottieni l'URL pubblico
      const downloadURL = await getDownloadURL(fileRef);
      console.log(`🔗 URL immagine: ${downloadURL}`);
      
      // Aggiorna il profilo utente in Firebase Auth
      await updateProfile(currentUser, {
        photoURL: downloadURL
      });
      console.log("👤 Profilo Auth aggiornato con successo");
      
      // Aggiorna anche il profilo in Firestore
      await updateFirestoreProfile(currentUser.uid, downloadURL);
      
      return downloadURL;
    } catch (storageError) {
      console.error("❌ Errore con Firebase Storage:", storageError);
      console.log("🔄 Passaggio al piano B: conversione in base64");
      
      // Se fallisce Firebase Storage, convertiamo l'immagine in base64
      return convertImageToBase64(file, currentUser);
    }
  } catch (error) {
    console.error('❌ Errore generale:', error);
    throw error;
  }
}

/**
 * Aggiorna il profilo utente in Firestore
 */
async function updateFirestoreProfile(userId: string, photoURL: string): Promise<void> {
  try {
    const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
    const snapshot = await getDocs(userQuery);
    
    if (!snapshot.empty) {
      // Aggiorna il documento esistente
      const userDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        photoURL,
        updatedAt: new Date().toISOString()
      });
      console.log("📝 Profilo Firestore aggiornato");
    } else {
      // Crea un nuovo documento
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      await addDoc(collection(db, 'users'), {
        uid: userId,
        displayName: currentUser.displayName || 'Utente',
        email: currentUser.email,
        photoURL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rating: 0,
        reviewCount: 0
      });
      console.log("📝 Nuovo profilo utente creato");
    }
  } catch (error) {
    console.error("❌ Errore aggiornamento Firestore:", error);
  }
}

/**
 * Converte un'immagine in base64 e la salva come URL data
 */
async function convertImageToBase64(file: File, currentUser: any): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          if (!event.target || typeof event.target.result !== 'string') {
            throw new Error("Conversione base64 fallita");
          }
          
          const base64Image = event.target.result;
          console.log("✅ Immagine convertita in base64");
          
          // Aggiorna il profilo utente in Firebase Auth
          await updateProfile(currentUser, {
            photoURL: base64Image
          });
          console.log("👤 Profilo Auth aggiornato con immagine base64");
          
          // Aggiorna anche il profilo in Firestore
          await updateFirestoreProfile(currentUser.uid, base64Image);
          
          resolve(base64Image);
        } catch (error) {
          console.error("❌ Errore dopo conversione:", error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error("❌ Errore lettura file:", error);
        reject(error);
      };
      
      // Inizia la lettura come base64
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("❌ Errore generale in base64:", error);
      reject(error);
    }
  });
}