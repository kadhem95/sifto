import { updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * Carica un'immagine di profilo direttamente come base64
 * Questa è una soluzione alternativa che non richiede Firebase Storage
 * @param file Il file immagine da caricare
 * @returns URL dell'immagine in formato base64
 */
export async function uploadImageAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Verifichiamo l'utente
      const currentUser = auth.currentUser;
      if (!currentUser) {
        reject(new Error("Utente non autenticato"));
        return;
      }

      // Convertiamo l'immagine in base64
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          if (!event.target || typeof event.target.result !== 'string') {
            reject(new Error("Errore nella conversione dell'immagine"));
            return;
          }
          
          const base64Image = event.target.result;
          console.log("✅ Immagine convertita in base64");
          
          // Aggiorniamo il profilo in Firebase Auth
          await updateProfile(currentUser, {
            photoURL: base64Image
          });
          console.log("✅ Profilo Auth aggiornato con l'immagine");
          
          // Aggiorniamo il profilo in Firestore
          const userQuery = query(
            collection(db, 'users'),
            where('uid', '==', currentUser.uid)
          );
          
          const snapshot = await getDocs(userQuery);
          
          if (!snapshot.empty) {
            // Aggiorniamo il documento esistente
            const userDoc = snapshot.docs[0];
            await updateDoc(doc(db, 'users', userDoc.id), {
              photoURL: base64Image,
              updatedAt: new Date().toISOString()
            });
            console.log("✅ Profilo Firestore aggiornato");
          } else {
            // Creiamo un nuovo documento
            await addDoc(collection(db, 'users'), {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Utente',
              email: currentUser.email,
              photoURL: base64Image,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              rating: 0,
              reviewCount: 0
            });
            console.log("✅ Nuovo profilo utente creato");
          }
          
          resolve(base64Image);
        } catch (error) {
          console.error("❌ Errore dopo la conversione in base64:", error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error("❌ Errore nella lettura del file:", error);
        reject(error);
      };
      
      // Iniziamo la lettura come URL dati
      console.log("Inizio conversione in base64...");
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error("❌ Errore generale:", error);
      reject(error);
    }
  });
}

/**
 * Ottimizza un'immagine prima di convertirla in base64
 * @param file L'immagine originale
 * @param maxWidth Larghezza massima dell'immagine
 * @param quality Qualità dell'immagine (0-1)
 * @returns Promise con il file ottimizzato
 */
export function optimizeImage(file: File, maxWidth: number = 800, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      // Creiamo un elemento immagine temporaneo
      const img = new Image();
      img.onload = () => {
        try {
          // Creiamo un canvas per il ridimensionamento
          const canvas = document.createElement('canvas');
          
          // Calcoliamo le dimensioni mantenendo le proporzioni
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          // Impostiamo le dimensioni del canvas
          canvas.width = width;
          canvas.height = height;
          
          // Disegniamo l'immagine ridimensionata
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Impossibile creare il contesto 2D"));
            return;
          }
          
          // Disegniamo l'immagine sul canvas
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convertiamo il canvas in blob
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error("Impossibile creare il blob"));
              return;
            }
            
            // Creiamo un nuovo file
            const optimizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            // Ritorniamo il file ottimizzato
            resolve(optimizedFile);
          }, 'image/jpeg', quality);
        } catch (error) {
          console.error("❌ Errore durante l'ottimizzazione:", error);
          reject(error);
        }
      };
      
      // Gestione errori di caricamento immagine
      img.onerror = () => {
        reject(new Error("Errore nel caricamento dell'immagine"));
      };
      
      // Carichiamo l'immagine
      img.src = URL.createObjectURL(file);
    } catch (error) {
      console.error("❌ Errore generale:", error);
      reject(error);
    }
  });
}