import { createContext, useEffect, useState, ReactNode } from "react";
import { getAuth, User, onAuthStateChanged } from "firebase/auth";
import { getUserProfile } from "@/lib/firebase";

interface AuthContextType {
  currentUser: User | null;
  userProfile: any | null;
  loading: boolean;
  phoneConfirmation: any | null;
  setPhoneConfirmation: (confirmation: any) => void;
}

export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  phoneConfirmation: null,
  setPhoneConfirmation: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [phoneConfirmation, setPhoneConfirmation] = useState<any | null>(null);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [auth]);

  const value = {
    currentUser,
    userProfile,
    loading,
    phoneConfirmation,
    setPhoneConfirmation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
