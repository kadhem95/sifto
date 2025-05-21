import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { db, getUserProfile } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  doc,
  getDoc,
  addDoc
} from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface MessagePreview {
  content: string;
  timestamp: string;
  senderId: string;
  type?: string;
}

interface ChatPreview {
  id: string;
  lastMessage: MessagePreview;
  otherUser: {
    id: string;
    name: string;
    photoURL?: string;
  };
  packageId?: string;
  tripId?: string;
  unreadCount: number;
}

export default function ChatList() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const loadChatRooms = async () => {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        // Query per trovare tutte le chat room dell'utente
        const chatRoomsQuery = query(
          collection(db, "chatRooms"),
          where("users", "array-contains", currentUser.uid)
        );
        
        const querySnapshot = await getDocs(chatRoomsQuery);
        
        if (querySnapshot.empty) {
          setChats([]);
          setIsLoading(false);
          return;
        }
        
        const chatPreviewsPromises = querySnapshot.docs.map(async (chatDoc) => {
          const chatData = chatDoc.data();
          const chatId = chatDoc.id;
          
          // Trova l'altro utente
          const otherUserId = chatData.users.find((id: string) => id !== currentUser.uid);
          
          // Ottieni dati utente usando la funzione migliorata dalla lib/firebase
          let otherUserName = "";
          let otherUserPhoto = undefined;
          
          try {
            // Funzione per ottenere o creare un profilo utente
            const getOrCreateUserProfile = async (userId: string) => {
              // Prima proviamo a ottenere il profilo esistente
              const usersRef = collection(db, 'users');
              const userQuery = query(usersRef, where('uid', '==', userId));
              const querySnapshot = await getDocs(userQuery);
              
              if (!querySnapshot.empty) {
                // Profilo trovato in Firestore
                return {
                  id: querySnapshot.docs[0].id,
                  ...querySnapshot.docs[0].data()
                };
              }
              
              // Profilo non trovato, lo creiamo
              console.log(`Lista chat: creazione profilo per utente ${userId}`);
              
              // Dati base per il nuovo profilo
              const profileData = {
                uid: userId,
                displayName: `Utente (${userId.slice(0, 6)})`,
                createdAt: new Date().toISOString(),
                rating: 0,
                reviewCount: 0
              };
              
              // Aggiungiamo il nuovo profilo utente a Firestore
              const docRef = await addDoc(collection(db, 'users'), profileData);
              
              console.log(`Profilo creato con successo per ${userId}`);
              
              // Restituiamo il profilo creato
              return {
                id: docRef.id,
                ...profileData
              };
            };
            
            // Ottieni o crea il profilo utente
            const userProfile = await getOrCreateUserProfile(otherUserId);
            
            // Ora abbiamo sicuramente un profilo, ma potrebbe essere di formati diversi
            // Convertiamo il profilo in un formato più sicuro
            const profileData = userProfile as any;
            
            // Prendiamo i dati che ci servono
            otherUserName = profileData.displayName || `Utente (${otherUserId.slice(0, 6)}...)`;
            otherUserPhoto = profileData.photoURL;
          } catch (error) {
            console.error("Errore nel recupero utente:", error);
            // Fallback in caso di errore
            otherUserName = `Utente (${otherUserId.slice(0, 6)}...)`;
          }
          
          // Recupera l'ultimo messaggio
          let lastMessage = {
            content: "Nessun messaggio",
            timestamp: chatData.createdAt || new Date().toISOString(),
            senderId: "system",
            type: "text"
          };
          
          let unreadCount = 0;
          
          try {
            const messagesQuery = query(
              collection(db, "chatRooms", chatId, "messages"),
              orderBy("timestamp", "desc")
            );
            
            const messagesSnapshot = await getDocs(messagesQuery);
            
            if (!messagesSnapshot.empty) {
              const messageData = messagesSnapshot.docs[0].data();
              lastMessage = {
                content: messageData.content,
                timestamp: messageData.timestamp,
                senderId: messageData.senderId,
                type: messageData.type || "text"
              };
              
              // Conta messaggi non letti
              unreadCount = messagesSnapshot.docs.filter(doc => {
                const data = doc.data();
                return data.senderId === otherUserId && !data.readBy?.includes(currentUser.uid);
              }).length;
            }
          } catch (error) {
            console.error("Errore nel recupero messaggi:", error);
          }
          
          // Dettagli pacchetto/viaggio
          let packageDetails = null;
          let tripDetails = null;
          
          if (chatData.packageId) {
            try {
              const packageDoc = await getDoc(doc(db, "packages", chatData.packageId));
              if (packageDoc.exists()) {
                packageDetails = packageDoc.data();
              }
            } catch (error) {
              console.error("Errore dettagli pacco:", error);
            }
          }
          
          if (chatData.tripId) {
            try {
              const tripDoc = await getDoc(doc(db, "trips", chatData.tripId));
              if (tripDoc.exists()) {
                tripDetails = tripDoc.data();
              }
            } catch (error) {
              console.error("Errore dettagli viaggio:", error);
            }
          }
          
          // Formatta contenuto
          let formattedContent = lastMessage.content;
          if (lastMessage.type === "location") {
            formattedContent = "📍 Posizione condivisa";
          } else if (lastMessage.type === "quickAction") {
            formattedContent = "⚡ Azione rapida";
          }
          
          // Nome chat
          let chatName = otherUserName;
          if (packageDetails && tripDetails) {
            chatName = `${otherUserName} • ${packageDetails.from} → ${packageDetails.to}`;
          }

          return {
            id: chatId,
            lastMessage: {
              ...lastMessage,
              content: formattedContent
            },
            otherUser: {
              id: otherUserId,
              name: chatName,
              photoURL: otherUserPhoto
            },
            packageId: chatData.packageId,
            tripId: chatData.tripId,
            unreadCount
          };
        });
        
        // Risolve tutte le promesse
        const chatPreviews = await Promise.all(chatPreviewsPromises);
        
        // Ordina per data ultimo messaggio
        chatPreviews.sort((a, b) => {
          const dateA = new Date(a.lastMessage.timestamp).getTime();
          const dateB = new Date(b.lastMessage.timestamp).getTime();
          return dateB - dateA;
        });
        
        setChats(chatPreviews);
      } catch (error) {
        console.error("Errore caricamento chat:", error);
        setErrorMsg("Impossibile caricare le conversazioni. Riprova più tardi.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadChatRooms();
  }, [currentUser, navigate]);

  // Formatta data relativa
  const formatRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: it });
    } catch (e) {
      return "recentemente";
    }
  };

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Messaggi</h1>
        
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-neutral-500">Caricamento conversazioni...</p>
            </div>
          </div>
        ) : errorMsg ? (
          <div className="text-center py-10">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">Si è verificato un errore</h3>
            <p className="text-neutral-500 max-w-xs mx-auto mb-6">{errorMsg}</p>
            <button 
              className="bg-primary text-white px-4 py-2 rounded-md"
              onClick={() => window.location.reload()}
            >
              Riprova
            </button>
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-10">
            <div className="bg-neutral-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">Nessuna conversazione</h3>
            <p className="text-neutral-500 max-w-xs mx-auto mb-6">
              Non hai ancora nessuna conversazione attiva. Le chat verranno create automaticamente quando accetti un pacco o qualcuno accetta il tuo pacco.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <div 
                key={chat.id}
                className="bg-white rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/chat/${chat.id}`)}
              >
                <div className="flex items-center">
                  <div className="relative">
                    <Avatar className="h-12 w-12 mr-3">
                      {chat.otherUser.photoURL ? (
                        <AvatarImage src={chat.otherUser.photoURL} />
                      ) : (
                        <AvatarFallback>
                          {chat.otherUser.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {chat.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {chat.unreadCount}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium truncate">{chat.otherUser.name}</h3>
                      <span className="text-xs text-neutral-500 ml-2 flex-shrink-0">
                        {formatRelativeTime(chat.lastMessage.timestamp)}
                      </span>
                    </div>
                    
                    <p className={`text-sm truncate ${
                      chat.unreadCount > 0 ? 'font-medium text-neutral-900' : 'text-neutral-500'
                    }`}>
                      {chat.lastMessage.senderId === currentUser?.uid ? 'Tu: ' : ''}
                      {chat.lastMessage.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}