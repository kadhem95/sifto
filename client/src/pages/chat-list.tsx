import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  onSnapshot,
  Timestamp,
  doc,
  getDoc
} from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface ChatPreview {
  id: string;
  lastMessage: {
    content: string;
    timestamp: string;
    senderId: string;
    type?: string;
  };
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

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    setIsLoading(true);

    // Query per trovare tutte le chat room dell'utente corrente
    const chatRoomsQuery = query(
      collection(db, "chatRooms"),
      where("users", "array-contains", currentUser.uid),
      // Ordina per ultimo messaggio (se implementiamo questo campo nella chatRoom)
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(chatRoomsQuery, async (snapshot) => {
      try {
        const chatPreviewsPromises = snapshot.docs.map(async (chatDoc) => {
          const chatData = chatDoc.data();
          const chatId = chatDoc.id;
          
          // Trova l'altro utente nella chat
          const otherUserId = chatData.users.find((id: string) => id !== currentUser.uid);
          
          // Ottieni i dati dell'altro utente
          let otherUserName = "Utente";
          let otherUserPhoto = undefined;
          
          try {
            const userQuery = query(
              collection(db, "users"),
              where("uid", "==", otherUserId)
            );
            const userSnapshot = await getDocs(userQuery);
            
            if (!userSnapshot.empty) {
              const userData = userSnapshot.docs[0].data();
              otherUserName = userData.displayName || "Utente";
              otherUserPhoto = userData.photoURL;
            }
          } catch (error) {
            console.error("Errore nel recupero dei dati utente:", error);
          }
          
          // Recupera l'ultimo messaggio della chat
          const messagesQuery = query(
            collection(db, "chatRooms", chatId, "messages"),
            orderBy("timestamp", "desc")
          );
          
          const messagesSnapshot = await getDocs(messagesQuery);
          
          let lastMessage = {
            content: "Nessun messaggio",
            timestamp: chatData.createdAt || new Date().toISOString(),
            senderId: "system"
          };
          
          let unreadCount = 0;
          
          if (!messagesSnapshot.empty) {
            const messageData = messagesSnapshot.docs[0].data();
            lastMessage = {
              content: messageData.content,
              timestamp: messageData.timestamp,
              senderId: messageData.senderId,
              type: messageData.type
            };
            
            // Conta i messaggi non letti (quelli inviati dall'altro utente e non contrassegnati come letti)
            unreadCount = messagesSnapshot.docs.filter(doc => {
              const data = doc.data();
              return data.senderId === otherUserId && !data.readBy?.includes(currentUser.uid);
            }).length;
          }
          
          // Dettagli aggiuntivi: pacchetto o viaggio associato
          let packageDetails = null;
          let tripDetails = null;
          
          if (chatData.packageId) {
            try {
              const packageDoc = await getDoc(doc(db, "packages", chatData.packageId));
              if (packageDoc.exists()) {
                packageDetails = packageDoc.data();
              }
            } catch (error) {
              console.error("Errore nel recupero dei dettagli del pacco:", error);
            }
          }
          
          if (chatData.tripId) {
            try {
              const tripDoc = await getDoc(doc(db, "trips", chatData.tripId));
              if (tripDoc.exists()) {
                tripDetails = tripDoc.data();
              }
            } catch (error) {
              console.error("Errore nel recupero dei dettagli del viaggio:", error);
            }
          }
          
          // Formatta il contenuto dell'ultimo messaggio in base al tipo
          let formattedContent = lastMessage.content;
          if (lastMessage.type === "location") {
            formattedContent = "📍 Posizione condivisa";
          } else if (lastMessage.type === "quickAction") {
            formattedContent = "⚡ Azione rapida";
          }
          
          // Determina il nome da visualizzare nella preview della chat
          let chatName = otherUserName;
          if (packageDetails && tripDetails) {
            // Se sono disponibili sia il pacco che il viaggio, usa entrambi per il nome della chat
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
        
        const chatPreviews = await Promise.all(chatPreviewsPromises);
        
        // Ordina per data dell'ultimo messaggio (più recente prima)
        chatPreviews.sort((a, b) => {
          const dateA = new Date(a.lastMessage.timestamp).getTime();
          const dateB = new Date(b.lastMessage.timestamp).getTime();
          return dateB - dateA;
        });
        
        setChats(chatPreviews);
      } catch (error) {
        console.error("Errore nel recupero delle chat:", error);
      } finally {
        setIsLoading(false);
      }
    });

    // Cleanup della subscription quando il componente viene smontato
    return () => unsubscribe();
  }, [currentUser, navigate]);

  // Funzione per formattare la data relativa (es. "2 ore fa")
  const formatRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: it });
    } catch (e) {
      return timestamp;
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