import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { auth, storage, db } from './firebase';

/**
 * Carica direttamente un'immagine su Firebase Storage
 * Versione semplificata per massima compatibilità
 */
export async function uploadImageToStorage(file: File): Promise<string> {
  try {
    // Verifica utente
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Utente non autenticato');
    }
    
    // Crea un nome file univoco
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filename = `profile_${currentUser.uid}_${timestamp}.${fileExt}`;
    const path = `profile_images/${filename}`;
    
    console.log(`Caricamento: ${path}`);
    
    // Crea riferimento a Firebase Storage
    const storageRef = ref(storage, path);
    
    // Carica il file
    await uploadBytes(storageRef, file);
    console.log('Immagine caricata con successo');
    
    // Ottieni URL pubblico
    const downloadURL = await getDownloadURL(storageRef);
    console.log(`URL pubblico: ${downloadURL}`);
    
    // Aggiorna il profilo in Firebase Auth
    await updateProfile(currentUser, {
      photoURL: downloadURL
    });
    console.log('Profilo Auth aggiornato');
    
    // Aggiorna il profilo in Firestore
    await updateFirestoreProfile(currentUser.uid, downloadURL);
    console.log('Profilo Firestore aggiornato');
    
    return downloadURL;
  } catch (error: any) {
    console.error('Errore durante il caricamento:', error);
    
    // Fornisci informazioni più dettagliate sull'errore
    if (error.code === 'storage/unauthorized') {
      throw new Error('Non hai i permessi per caricare file su Firebase Storage');
    } else if (error.code === 'storage/canceled') {
      throw new Error('Caricamento annullato');
    } else if (error.code === 'storage/quota-exceeded') {
      throw new Error('Quota di storage superata');
    } else {
      throw error;
    }
  }
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
    // Non bloccare l'applicazione per errori Firestore
  }
}

/**
 * Ridimensiona l'immagine prima di caricarla
 */
export function resizeImage(file: File, maxWidth: number = 500, maxHeight: number = 500): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      // Crea un elemento immagine
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = function(e: any) {
        img.src = e.target.result;
        
        img.onload = function() {
          try {
            // Calcola le dimensioni proporzionali
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
              if (width > maxWidth) {
                height = Math.round(height * maxWidth / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round(width * maxHeight / height);
                height = maxHeight;
              }
            }
            
            // Crea un canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            // Disegna l'immagine sul canvas
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Impossibile ottenere il contesto 2D'));
              return;
            }
            
            ctx.drawImage(img, 0, 0, width, height);
            
            // Converti in blob
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Impossibile creare il blob'));
                return;
              }
              
              // Crea un nuovo file
              const newFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              
              resolve(newFile);
            }, 'image/jpeg', 0.85);
          } catch (error) {
            reject(error);
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