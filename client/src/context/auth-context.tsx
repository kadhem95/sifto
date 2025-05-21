import { createContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { getUserProfile, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  userProfile: any | null;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  userProfile: null,
  loading: true,
  refreshUserProfile: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Funzione per aggiornare manualmente il profilo utente
  const refreshUserProfile = async () => {
    if (currentUser) {
      try {
        console.log("Aggiornamento manuale del profilo utente...");
        const profile = await getUserProfile(currentUser.uid);
        setUserProfile(profile);
        console.log("Profilo utente aggiornato:", profile);
      } catch (error) {
        console.error("Errore nell'aggiornamento del profilo:", error);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Stato autenticazione cambiato:", user?.uid);
      setCurrentUser(user);
      
      if (user) {
        try {
          // Recupera il profilo utente da Firestore
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
          console.log("Profilo utente recuperato:", profile);
          
          // Imposta un listener per gli aggiornamenti del profilo utente
          const userQuery = query(collection(db, 'users'), where('uid', '==', user.uid));
          const unsubscribeUser = onSnapshot(userQuery, (snapshot) => {
            if (!snapshot.empty) {
              const userDoc = snapshot.docs[0];
              const userData = userDoc.data();
              console.log("Profilo utente aggiornato in tempo reale:", userData);
              setUserProfile({
                id: userDoc.id,
                ...userData
              });
            }
          }, (error) => {
            console.error("Errore nel listener del profilo:", error);
          });
          
          // Assicuriamoci di rimuovere il listener quando necessario
          return () => {
            unsubscribeUser();
          };
          
        } catch (error) {
          console.error("Errore nel recupero del profilo utente:", error);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    setCurrentUser,
    userProfile,
    loading,
    refreshUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
