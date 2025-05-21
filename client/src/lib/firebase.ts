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
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
    console.log(`Tentativo di creazione/aggiornamento profilo per ${userId}`);
    
    // Verifichiamo prima se l'utente esiste già
    const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      console.log(`Profilo utente già esistente per l'ID: ${userId}`);
      
      // Se esiste già, verifichiamo se ci sono dati da aggiornare
      const userDoc = userSnapshot.docs[0];
      const existingData = userDoc.data();
      let needsUpdate = false;
      
      // Verifichiamo se ci sono campi da aggiornare
      for (const key in userData) {
        if (userData[key] && (!existingData[key] || existingData[key] !== userData[key])) {
          needsUpdate = true;
          break;
        }
      }
      
      if (needsUpdate) {
        console.log(`Aggiornamento profilo per l'utente ${userId}`);
        const userRef = doc(db, 'users', userDoc.id);
        await updateDoc(userRef, {
          ...userData,
          updatedAt: new Date().toISOString()
        });
        
        // Otteniamo i dati aggiornati
        const updatedDoc = await getDoc(userRef);
        return {
          id: userDoc.id,
          ...updatedDoc.data()
        };
      }
      
      // Se non necessita aggiornamenti, restituiamo i dati esistenti
      return {
        id: userDoc.id,
        ...existingData
      };
    }
    
    // Se non esiste, lo creiamo
    console.log(`Creazione nuovo profilo utente per l'ID: ${userId}`);
    
    // Assicuriamoci che displayName non sia vuoto
    if (!userData.displayName) {
      userData.displayName = `Utente (${userId.slice(0, 6)})`;
    }
    
    const userDocRef = await addDoc(collection(db, 'users'), {
      uid: userId,
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rating: 0,
      reviewCount: 0
    });
    
    // Restituisci il nuovo documento creato
    const newUserDoc = await getDoc(userDocRef);
    return {
      id: userDocRef.id,
      ...newUserDoc.data()
    };
  } catch (error) {
    console.error("Errore nella creazione del profilo utente:", error);
    // Per evitare di bloccare l'applicazione, restituiamo un profilo minimo
    return {
      uid: userId,
      displayName: `Utente (${userId.slice(0, 6)})`,
      createdAt: new Date().toISOString()
    };
  }
};

// Nuova funzione migliorata, garantisce sempre un risultato valido
export const getUserProfile = async (userId: string) => {
  try {
    console.log(`Recupero profilo per utente ${userId}...`);
    
    // Fonte 1: Firebase Auth (se l'utente corrente è quello richiesto)
    let authUserData = null;
    if (auth.currentUser && auth.currentUser.uid === userId) {
      authUserData = {
        uid: userId,
        displayName: auth.currentUser.displayName,
        email: auth.currentUser.email,
        photoURL: auth.currentUser.photoURL,
        phoneNumber: auth.currentUser.phoneNumber
      };
      console.log(`Dati recuperati da Firebase Auth:`, authUserData.displayName);
    }
    
    // Fonte 2: Firestore database
    const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
    const userSnapshot = await getDocs(userQuery);
    let firestoreUserData = null;
    
    if (!userSnapshot.empty) {
      firestoreUserData = {
        id: userSnapshot.docs[0].id,
        ...userSnapshot.docs[0].data()
      };
      console.log(`Dati recuperati da Firestore:`, firestoreUserData.displayName);
    }
    
    // Se abbiamo trovato dati in Firestore
    if (firestoreUserData) {
      // Combiniamo i dati, dando priorità a quelli di Auth se disponibili
      return {
        ...firestoreUserData,
        ...(authUserData ? {
          displayName: authUserData.displayName || firestoreUserData.displayName,
          photoURL: authUserData.photoURL || firestoreUserData.photoURL,
        } : {})
      };
    }
    
    // Se non abbiamo trovato nulla in Firestore ma abbiamo dati di Auth
    if (authUserData && (authUserData.displayName || authUserData.email)) {
      // Creiamo automaticamente un nuovo profilo utente in Firestore
      console.log(`Creazione automatica del profilo per l'utente ${userId} da Auth`);
      
      const userData = {
        uid: userId,
        displayName: authUserData.displayName || `Utente ${userId.slice(0, 6)}`,
        email: authUserData.email || "",
        photoURL: authUserData.photoURL || "",
        phoneNumber: authUserData.phoneNumber || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rating: 0,
        reviewCount: 0
      };
      
      try {
        // Creazione del profilo in Firestore
        const userDocRef = await addDoc(collection(db, 'users'), userData);
        console.log(`Profilo creato con successo in Firestore con ID: ${userDocRef.id}`);
        
        return {
          id: userDocRef.id,
          ...userData
        };
      } catch (createError) {
        console.error("Errore nella creazione del profilo:", createError);
        return userData; // Restituiamo comunque i dati anche se non siamo riusciti a salvarli
      }
    }
    
    // Se non abbiamo trovato dati da nessuna parte, creiamo un profilo minimale
    console.log(`Creazione profilo minimo per l'utente ${userId}`);
    const minimalUserData = {
      uid: userId,
      displayName: `Utente (${userId.slice(0, 6)})`,
      createdAt: new Date().toISOString(),
      rating: 0,
      reviewCount: 0
    };
    
    // Proviamo a salvare anche questo profilo minimo
    try {
      const minimalDocRef = await addDoc(collection(db, 'users'), minimalUserData);
      console.log(`Profilo minimo creato in Firestore con ID: ${minimalDocRef.id}`);
      
      return {
        id: minimalDocRef.id,
        ...minimalUserData
      };
    } catch (minimalError) {
      console.warn("Impossibile salvare il profilo minimo:", minimalError);
      return minimalUserData; // Restituiamo i dati anche in caso di errore
    }
  } catch (error) {
    console.error("Errore generale nel recupero del profilo:", error);
    // Fallback per garantire che ci sia sempre un risultato
    return {
      uid: userId,
      displayName: `Utente (${userId.slice(0, 6)})`,
      createdAt: new Date().toISOString()
    };
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

// Funzione per caricare l'immagine del profilo
export const uploadProfileImage = async (userId: string, file: File) => {
  try {
    // Usiamo il timestamp per evitare problemi di cache con lo stesso nome file
    const fileName = `profile_${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `users/${userId}/profile/${fileName}`);
    
    // Carica il file
    await uploadBytes(storageRef, file);
    
    // Ottieni l'URL del file caricato
    const downloadURL = await getDownloadURL(storageRef);
    
    // Aggiorna il profilo dell'utente su Firebase Auth
    const currentUser = auth.currentUser;
    if (currentUser) {
      await updateProfile(currentUser, {
        photoURL: downloadURL
      });
    }
    
    // Aggiorna anche il profilo dell'utente in Firestore
    const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      const userDoc = userSnapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        photoURL: downloadURL,
        updatedAt: new Date().toISOString()
      });
    }
    
    return downloadURL;
  } catch (error) {
    console.error("Errore durante il caricamento dell'immagine del profilo:", error);
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

// Match functions
export const createMatch = async (matchData: any) => {
  try {
    // Create the match document
    const matchRef = await addDoc(collection(db, 'matches'), {
      ...matchData,
      createdAt: new Date().toISOString(),
      status: 'accepted'
    });
    
    // Update the package status to 'matched'
    if (matchData.packageId) {
      const packageRef = doc(db, 'packages', matchData.packageId);
      await updateDoc(packageRef, {
        status: 'matched',
        matchId: matchRef.id,
        travelerId: matchData.travelerId
      });
    }
    
    return matchRef;
  } catch (error) {
    console.error("Error creating match:", error);
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
