import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  User
} from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  uploadString,
  deleteObject
} from "firebase/storage";

// Initialize Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "000000000000", // Optional for basic auth
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize the Firebase app
const app = initializeApp(firebaseConfig);

// Get Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Email and Password Authentication
export interface RegisterData {
  email: string;
  password: string;
  displayName?: string;
}

// Register new user with email and password
export const registerWithEmail = async ({ email, password, displayName }: RegisterData) => {
  try {
    console.log(`Attempting to register user with email: ${email}`);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with display name if provided
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    console.log("User registered successfully");
    return userCredential.user;
  } catch (error: any) {
    console.error("Error during registration:", error);
    
    // Provide more detailed error information
    if (error.code === 'auth/email-already-in-use') {
      throw new Error("L'email è già in uso da un altro account");
    } else if (error.code === 'auth/invalid-email') {
      throw new Error("L'indirizzo email non è valido");
    } else if (error.code === 'auth/weak-password') {
      throw new Error("La password è troppo debole");
    } else {
      throw new Error("Errore durante la registrazione. Riprova più tardi.");
    }
  }
};

// Login user with email and password
export const loginWithEmail = async (email: string, password: string) => {
  try {
    console.log(`Attempting to login user with email: ${email}`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("User logged in successfully");
    return userCredential.user;
  } catch (error: any) {
    console.error("Error during login:", error);
    
    // Provide more detailed error information
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error("Email o password non corretti");
    } else if (error.code === 'auth/invalid-email') {
      throw new Error("L'indirizzo email non è valido");
    } else if (error.code === 'auth/user-disabled') {
      throw new Error("Questo account è stato disabilitato");
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error("Troppi tentativi falliti. Riprova più tardi.");
    } else {
      throw new Error("Errore durante il login. Riprova più tardi.");
    }
  }
};

// Send password reset email
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log("Password reset email sent");
    return true;
  } catch (error: any) {
    console.error("Error sending password reset email:", error);
    
    // Provide more detailed error information
    if (error.code === 'auth/user-not-found') {
      throw new Error("Nessun utente trovato con questa email");
    } else if (error.code === 'auth/invalid-email') {
      throw new Error("L'indirizzo email non è valido");
    } else {
      throw new Error("Errore nell'invio dell'email di reset. Riprova più tardi.");
    }
  }
};

// Logout user
export const logout = async () => {
  try {
    await signOut(auth);
    console.log("User logged out successfully");
    return true;
  } catch (error) {
    console.error("Error during logout:", error);
    throw new Error("Errore durante il logout. Riprova più tardi.");
  }
};

// User profile functions
export const createUserProfile = async (userId: string, userData: any) => {
  try {
    await addDoc(collection(db, 'users'), {
      uid: userId,
      ...userData,
      createdAt: new Date().toISOString(),
      rating: 0,
      reviewCount: 0
    });
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      return null;
    }
    
    return {
      id: userSnapshot.docs[0].id,
      ...userSnapshot.docs[0].data()
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

// Carica l'immagine del profilo per un utente specifico
export const uploadProfileImage = async (user: User, file: File): Promise<string> => {
  try {
    // Verifica che ci sia un utente e un file
    if (!user || !file) {
      throw new Error("Utente o file non valido");
    }
    
    // Verifica la dimensione del file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("L'immagine è troppo grande. Dimensione massima: 5MB");
    }
    
    // Verifica il tipo di file (solo immagini)
    if (!file.type.startsWith('image/')) {
      throw new Error("Il file deve essere un'immagine (JPG, PNG, GIF, ecc.)");
    }
    
    // Genera un nome di file univoco
    const fileName = `profile_${user.uid}_${Date.now()}`;
    const storageRef = ref(storage, `profile_images/${fileName}`);
    
    // Carica l'immagine
    const snapshot = await uploadBytes(storageRef, file);
    console.log("Upload completato:", snapshot.metadata.name);
    
    // Ottieni l'URL di download
    const downloadURL = await getDownloadURL(storageRef);
    
    if (!downloadURL) {
      throw new Error("Errore nel recupero dell'URL dell'immagine");
    }
    
    // Aggiorna il profilo dell'utente in Firebase Auth
    await updateProfile(user, {
      photoURL: downloadURL
    });
    
    // Aggiorna anche il profilo in Firestore
    const userQuery = query(collection(db, 'users'), where('uid', '==', user.uid));
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      // Aggiorna il documento esistente
      const userDoc = userSnapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        photoURL: downloadURL
      });
    } else {
      // Crea un nuovo documento se non esiste
      await addDoc(collection(db, 'users'), {
        uid: user.uid,
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: downloadURL,
        createdAt: new Date().toISOString(),
        rating: 0,
        reviewCount: 0
      });
    }
    
    return downloadURL;
  } catch (error: any) {
    console.error("Errore durante il caricamento dell'immagine del profilo:", error);
    throw error;
  }
};

// Package functions
export const createPackage = async (packageData: any) => {
  try {
    return await addDoc(collection(db, 'packages'), {
      ...packageData,
      createdAt: new Date().toISOString(),
      status: 'pending'
    });
  } catch (error) {
    console.error("Error creating package:", error);
    throw error;
  }
};

export const uploadPackageImage = async (packageId: string, file: File) => {
  try {
    const storageRef = ref(storage, `packages/${packageId}/${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    const packageRef = doc(db, 'packages', packageId);
    await updateDoc(packageRef, {
      imageUrl: downloadURL
    });
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading package image:", error);
    throw error;
  }
};

// Trip functions
export const createTrip = async (tripData: any) => {
  try {
    return await addDoc(collection(db, 'trips'), {
      ...tripData,
      createdAt: new Date().toISOString(),
      status: 'active'
    });
  } catch (error) {
    console.error("Error creating trip:", error);
    throw error;
  }
};

// Chat functions
export const createChatRoom = async (senderId: string, receiverId: string, packageId?: string, tripId?: string) => {
  try {
    return await addDoc(collection(db, 'chatRooms'), {
      participants: [senderId, receiverId],
      packageId,
      tripId,
      createdAt: new Date().toISOString(),
      lastMessage: null,
      lastMessageTime: null
    });
  } catch (error) {
    console.error("Error creating chat room:", error);
    throw error;
  }
};

export const sendMessage = async (chatRoomId: string, senderId: string, content: string, type: 'text' | 'location' | 'quickAction' = 'text') => {
  try {
    const messageRef = await addDoc(collection(db, 'chatRooms', chatRoomId, 'messages'), {
      senderId,
      content,
      type,
      timestamp: new Date().toISOString(),
      read: false
    });
    
    const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
    await updateDoc(chatRoomRef, {
      lastMessage: content,
      lastMessageTime: new Date().toISOString()
    });
    
    return messageRef;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// Review functions
export const submitReview = async (reviewData: any) => {
  try {
    const reviewRef = await addDoc(collection(db, 'reviews'), {
      ...reviewData,
      createdAt: new Date().toISOString()
    });
    
    // Update user's average rating
    const userQuery = query(collection(db, 'users'), where('uid', '==', reviewData.receiverId));
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data();
      const userRef = doc(db, 'users', userSnapshot.docs[0].id);
      
      const oldRating = userData.rating || 0;
      const reviewCount = userData.reviewCount || 0;
      
      const newReviewCount = reviewCount + 1;
      const newRating = ((oldRating * reviewCount) + reviewData.rating) / newReviewCount;
      
      await updateDoc(userRef, {
        rating: newRating,
        reviewCount: newReviewCount
      });
    }
    
    return reviewRef;
  } catch (error) {
    console.error("Error submitting review:", error);
    throw error;
  }
};
