import { updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * Carica un'immagine come base64 e la imposta come immagine profilo
 * Questo metodo è una soluzione più semplice che non richiede Firebase Storage
 */
export async function uploadAndSetProfileImage(file: File): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Utente non autenticato');
  }
  
  try {
    // Convertiamo il file in una stringa base64
    const base64String = await fileToBase64(file);
    
    // Utilizziamo direttamente l'immagine come base64 per l'avatar
    // Questo ci permette di usare l'immagine reale caricata dall'utente
    // Abbiamo già convertito il file in formato base64 e possiamo usarlo direttamente
    const avatarUrl = base64String;
    
    console.log('Creato URL avatar:', avatarUrl);
    
    // Aggiorniamo solo il profilo in Firebase Auth
    await updateProfile(currentUser, {
      photoURL: avatarUrl
    });
    console.log('Profilo Auth aggiornato con successo');
    
    // Aggiorniamo il profilo utente in Firestore
    await updateFirestoreProfile(currentUser.uid, avatarUrl);
    console.log('Profilo Firestore aggiornato con successo');
    
    return avatarUrl;
  } catch (error) {
    console.error('Errore durante il caricamento dell\'immagine:', error);
    throw error;
  }
}

/**
 * Converte un file in una stringa base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Impossibile convertire il file in base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Aggiorna il profilo utente in Firestore
 */
export async function updateFirestoreProfile(userId: string, photoURL: string): Promise<void> {
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
    }
  } catch (error) {
    console.error('Errore aggiornamento Firestore:', error);
  }
}

/**
 * Ridimensiona l'immagine prima di convertirla in base64
 * (versione più semplice per compatibilità massima)
 */
export function resizeImageSimple(file: File, maxSize: number = 500): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = function(e) {
        if (!e.target || typeof e.target.result !== 'string') {
          reject(new Error('Errore nella lettura del file'));
          return;
        }
        
        img.src = e.target.result;
        
        img.onload = function() {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Ridimensiona mantenendo le proporzioni
            if (width > height) {
              if (width > maxSize) {
                height = Math.round(height * maxSize / width);
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = Math.round(width * maxSize / height);
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Impossibile ottenere il contesto 2D'));
              return;
            }
            
            ctx.drawImage(img, 0, 0, width, height);
            
            // Converti e risolvi
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Impossibile creare il blob'));
                return;
              }
              
              const resizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              
              resolve(resizedFile);
            }, 'image/jpeg', 0.8);
          } catch (err) {
            reject(err);
          }
        };
      };
      
      reader.onerror = function() {
        reject(new Error('Errore nella lettura del file'));
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      reject(error);
    }
  });
}