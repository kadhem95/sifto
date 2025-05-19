import { initializeApp } from "firebase/app";
import { getAuth, signInWithPhoneNumber, PhoneAuthProvider, RecaptchaVerifier } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Re-initialize Firebase here to ensure it's available
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

// Initialize reCAPTCHA verifier
let recaptchaVerifier: RecaptchaVerifier | null = null;

export const initRecaptcha = (containerId: string) => {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
  }
  
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved, allow signInWithPhoneNumber.
    }
  });
  
  return recaptchaVerifier;
};

// Phone authentication
export const signInWithPhone = async (phoneNumber: string, recaptchaContainer: string) => {
  try {
    const verifier = initRecaptcha(recaptchaContainer);
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    return confirmationResult;
  } catch (error) {
    console.error("Error during signInWithPhone:", error);
    throw error;
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
