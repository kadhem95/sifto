import { auth, db } from './firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from "firebase/firestore";
import { updateProfile } from 'firebase/auth';

/**
 * Sistema centralizzato di gestione avatar generati
 * Utilizza UI Avatars per generare avatar personalizzati basati sul nome utente
 * Questo sistema non richiede Firebase Storage e funziona in modo affidabile
 */

/**
 * Genera un URL per un avatar personalizzato basato sul nome dell'utente
 * @param displayName Nome dell'utente (utilizzato per generare le iniziali)
 * @param colorIndex Indice del colore (opzionale, per avere avatar con colori diversi)
 * @returns URL dell'avatar generato
 */
export function generateAvatarUrl(displayName: string = 'User', colorIndex: number = 0): string {
  // Cache busting con timestamp
  const timestamp = Date.now();
  
  // Colori predefiniti che si abbinano al tema dell'app
  const colors = [
    '00A896', // Verde primario
    '05668D', // Blu
    'F0A202', // Arancione
    'F18701', // Arancione scuro
    'D95D39'  // Rosso
  ];
  
  // Selezione colore basata sull'indice o sul nome dell'utente per consistenza
  const colorPos = colorIndex || displayName.length % colors.length;
  const bgColor = colors[colorPos];
  
  // Pulizia e codifica del nome
  const cleanName = displayName.trim() || 'User';
  const encodedName = encodeURIComponent(cleanName);
  
  // Parametri per personalizzare l'avatar
  return `https://ui-avatars.com/api/?name=${encodedName}&background=${bgColor}&color=fff&size=256&bold=true&t=${timestamp}`;
}

/**
 * Aggiorna l'immagine del profilo dell'utente con un avatar generato
 * @param forcedName Nome forzato da utilizzare (opzionale)
 * @param colorIndex Indice del colore da utilizzare (opzionale)
 * @returns URL dell'avatar generato o null in caso di errore
 */
export async function updateUserAvatar(forcedName?: string, colorIndex?: number): Promise<string | null> {
  try {
    // Verifico che esista un utente autenticato
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("Nessun utente autenticato per aggiornare l'avatar");
      return null;
    }

    const userId = currentUser.uid;
    const displayName = forcedName || currentUser.displayName || 'User';
    
    // Generiamo un avatar basato sul nome
    const avatarUrl = generateAvatarUrl(displayName, colorIndex);
    console.log(`Avatar generato per ${displayName}: ${avatarUrl}`);
    
    // Aggiorniamo il profilo in Firebase Auth
    await updateProfile(currentUser, {
      photoURL: avatarUrl
    });
    console.log("Profilo Auth aggiornato con nuovo avatar");
    
    // Aggiorniamo anche il profilo in Firestore
    try {
      const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        // Aggiorniamo il documento esistente
        const userDoc = userSnapshot.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), {
          photoURL: avatarUrl,
          updatedAt: new Date().toISOString()
        });
        console.log(`Profilo Firestore aggiornato con nuovo avatar: ${userDoc.id}`);
      } else {
        // Creiamo un nuovo profilo utente
        await addDoc(collection(db, 'users'), {
          uid: userId,
          displayName: displayName,
          email: currentUser.email,
          photoURL: avatarUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rating: 0,
          reviewCount: 0
        });
        console.log("Nuovo profilo utente creato in Firestore con avatar");
      }
    } catch (firestoreError) {
      console.error("Errore nell'aggiornamento Firestore:", firestoreError);
      // Non blocchiamo il processo in caso di errore con Firestore
    }
    
    return avatarUrl;
  } catch (error) {
    console.error("Errore durante l'aggiornamento dell'avatar:", error);
    return null;
  }
}

/**
 * Assicura che l'utente abbia sempre un'immagine profilo valida
 * Da chiamare all'avvio dell'app o dopo il login
 */
export async function ensureUserHasAvatar(): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    // Se l'utente non ha un'immagine profilo, ne generiamo una
    if (!currentUser.photoURL) {
      console.log("Utente senza immagine profilo, generazione automatica");
      await updateUserAvatar();
    }
  } catch (error) {
    console.error("Errore nel controllo dell'avatar:", error);
  }
}