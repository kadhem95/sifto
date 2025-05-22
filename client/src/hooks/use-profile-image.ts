import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Custom hook per ottenere l'URL dell'immagine profilo di un utente
 * Recupera l'immagine direttamente da Firestore per garantire la massima coerenza
 */
export function useProfileImage(userId: string | undefined | null) {
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchProfileImage() {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        // Recupera il documento utente da Firestore
        const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data();
          setProfileImageUrl(userData.photoURL || null);
        } else {
          setProfileImageUrl(null);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Errore nel recupero dell\'immagine profilo:', err);
        setError(err as Error);
        setIsLoading(false);
      }
    }

    setIsLoading(true);
    fetchProfileImage();
  }, [userId]);

  return { profileImageUrl, isLoading, error };
}