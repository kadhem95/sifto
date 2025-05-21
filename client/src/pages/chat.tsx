import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import MessageItem, { MessageType } from "@/components/chat/message-item";
import QuickActions from "@/components/chat/quick-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { 
  db, 
  sendMessage, 
  getUserProfile
} from "@/lib/firebase";
import { 
  doc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  getDoc, 
  where, 
  getDocs,
  updateDoc
} from "firebase/firestore";

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: MessageType;
}

interface ChatParticipant {
  id: string;
  name: string;
  photoURL?: string;
  isOnline?: boolean;
}

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [participant, setParticipant] = useState<ChatParticipant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatDetails, setChatDetails] = useState<any>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Gestione dello scroll quando arrivano nuovi messaggi o quando la tastiera viene attivata
  useEffect(() => {
    // Piccolo ritardo per assicurarsi che il rendering sia completato
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages]);
  
  // Scroll automatico quando l'input viene messo a fuoco (tastiera aperta)
  useEffect(() => {
    if (isInputFocused) {
      // Assicuriamo che la vista si sposti immediatamente quando la tastiera si apre
      scrollToBottom(true);
    }
  }, [isInputFocused]);
  
  // Funzione avanzata per scroll chat
  const scrollToBottom = (instant = false) => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ 
      behavior: instant ? "auto" : "smooth",
      block: "end" 
    });
  };

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const fetchChatRoom = async () => {
      try {
        // Get chat room details
        const chatRoomRef = doc(db, "chatRooms", id);
        const chatRoomSnapshot = await getDoc(chatRoomRef);
        
        if (!chatRoomSnapshot.exists()) {
          navigate("/chat/list");
          return;
        }
        
        const chatRoomData = chatRoomSnapshot.data();
        setChatDetails(chatRoomData);
        
        // Get other participant info
        // Compatibilità con il nuovo formato delle chat room che usa 'users' invece di 'participants'
        const participants = chatRoomData.participants || chatRoomData.users || [];
        console.log("Chat room data:", chatRoomData);
        const participantId = participants.find(
          (pid: string) => pid !== currentUser.uid
        );
        
        if (participantId) {
          const participantProfile = await getUserProfile(participantId);
          
          if (participantProfile) {
            // Convertiamo il formato del profilo utente nel formato richiesto da ChatParticipant
            const profileData = participantProfile as any;
            setParticipant({
              id: profileData.uid || "",
              name: profileData.displayName || "Utente sconosciuto",
              photoURL: profileData.photoURL,
              isOnline: true // Per scopi dimostrativi, mostriamo sempre come online
            });
          }
        }
        
        // Subscribe to messages
        const messagesQuery = query(
          collection(db, "chatRooms", id, "messages"),
          orderBy("timestamp", "asc")
        );
        
        const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
          const messagesList: Message[] = [];
          querySnapshot.forEach((doc) => {
            messagesList.push({
              id: doc.id,
              ...doc.data()
            } as Message);
          });
          
          setMessages(messagesList);
          setIsLoading(false);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error("Error fetching chat:", error);
        setIsLoading(false);
      }
    };

    // Eseguiamo la funzione per recuperare i dati della chat
    fetchChatRoom();

    // Non è necessario un cleanup per questa funzione poiché non restituisce un unsubscribe
    return () => {
      // Cleanup se necessario in futuro
    };
  }, [currentUser, id, navigate]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    
    try {
      // Prima resettiamo il campo di input per migliorare la reattività percepita
      const messageToSend = newMessage;
      setNewMessage("");
      
      // Poi inviamo il messaggio
      await sendMessage(id, currentUser.uid, messageToSend);
      
      // Scroll immediato al fondo
      setTimeout(() => scrollToBottom(true), 50);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = async (action: string) => {
    if (!currentUser) return;
    
    try {
      await sendMessage(id, currentUser.uid, action, "quickAction");
    } catch (error) {
      console.error("Error sending quick action:", error);
    }
  };

  const handleSetMeetingPoint = () => {
    handleQuickAction("📍 Meeting point: Let's meet at...");
  };

  const handleConfirmPrice = () => {
    if (chatDetails?.packageId) {
      handleQuickAction(`💸 I confirm the price of €${chatDetails.packagePrice || "..."}`);
    } else {
      handleQuickAction("💸 Let's discuss the price");
    }
  };

  const handleDeliveryComplete = async () => {
    if (!currentUser) return;
    
    await handleQuickAction("📦 Pacco consegnato con successo!");
    
    // Aggiorniamo lo stato della consegna nel database
    if (chatDetails?.packageId || chatDetails?.tripId) {
      try {
        const packageId = chatDetails?.packageId;
        const tripId = chatDetails?.tripId;
        
        // Aggiorniamo lo stato del match per segnalare che è stato consegnato
        // e che è pronto per essere recensito
        if (packageId) {
          const matchRef = collection(db, "matches");
          const matchQuery = query(
            matchRef,
            where("packageId", "==", packageId),
            where("tripId", "==", tripId || null)
          );
          
          const matchSnapshot = await getDocs(matchQuery);
          if (!matchSnapshot.empty) {
            const matchDoc = matchSnapshot.docs[0];
            await updateDoc(doc(db, "matches", matchDoc.id), {
              status: "completed",
              completedAt: new Date().toISOString(),
              reviewPending: true
            });
            
            // Invia un messaggio informativo nella chat
            await sendMessage(
              id, 
              currentUser.uid, 
              "📝 Il pacco è stato consegnato! Ora è possibile lasciare una recensione", 
              "text"
            );
            
            // Inseriamo un messaggio con informazioni sulla recensione
            setTimeout(async () => {
              if (currentUser) {
                const matchId = matchDoc.id;
                await sendMessage(
                  id, 
                  currentUser.uid, 
                  "Per lasciare una recensione, vai nella sezione 'Le mie spedizioni' e seleziona questa consegna", 
                  "text"
                );
              }
            }, 500);
          }
        }
      } catch (error) {
        console.error("Errore nell'aggiornamento dello stato di consegna:", error);
      }
    }
  };

  const goBackToList = () => {
    // Check if we should go to travelers list or packages list
    if (chatDetails?.packageId) {
      navigate("/travelers");
    } else if (chatDetails?.tripId) {
      navigate("/packages");
    } else {
      navigate("/");
    }
  };

  if (isLoading) {
    return (
      <AppLayout hideNavigation>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-neutral-500">Loading conversation...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideNavigation>
      <div 
        className="flex flex-col h-screen max-w-lg mx-auto overflow-hidden"
        style={{ maxHeight: "-webkit-fill-available" }} // Fix per mobile safari
      >
        {/* Header fisso in alto */}
        <div className="flex items-center p-3 border-b border-neutral-100 bg-white shadow-sm z-20 flex-shrink-0 sticky top-0">
          <button className="p-2 -ml-1" onClick={goBackToList}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-neutral-800"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          {participant && (
            <div className="flex items-center ml-1 flex-1">
              <Avatar className="w-9 h-9">
                <AvatarImage src={participant.photoURL} alt={participant.name} />
                <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="ml-2.5 truncate">
                <h3 className="text-neutral-900 font-medium text-sm truncate">{participant.name}</h3>
                <div className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                  <span className="text-xs text-neutral-500">Online</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Container scrollabile dei messaggi con padding che si adatta in base al focus dell'input */}
        <div 
          className={`flex-1 overflow-y-auto p-2 md:p-3 pt-4 ${isInputFocused ? 'pb-16' : 'pb-28'}`}
          style={{ backgroundColor: "#F7F7FC", overscrollBehavior: "contain" }}
        >
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              content={message.content}
              timestamp={message.timestamp}
              isSender={message.senderId === currentUser?.uid}
              type={message.type}
              senderAvatar={message.senderId !== currentUser?.uid ? participant?.photoURL : undefined}
              senderName={message.senderId !== currentUser?.uid ? participant?.name : undefined}
            />
          ))}
          
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-12 pb-6 text-neutral-500">
              <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm">Nessun messaggio.</p>
              <p className="text-xs mt-1">Inizia la conversazione!</p>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Footer con quick actions e input - fisso in basso ma con comportamento adattivo */}
        <div className={`fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-neutral-100 shadow-md z-10 transition-all duration-200 ${isInputFocused ? "transform translate-y-0" : ""}`}>
          {/* Quick Actions - visibili solo quando l'input non è attivo */}
          {!isInputFocused && (
            <QuickActions
              onMeetingPoint={handleSetMeetingPoint}
              onConfirmPrice={handleConfirmPrice}
              onDeliveryComplete={handleDeliveryComplete}
            />
          )}
          
          {/* Input Area - con gestione del focus */}
          <div className="p-2 pb-3 bg-white flex items-center">
            <div className="flex-1 bg-neutral-100 rounded-full px-4 min-h-[48px] flex items-center">
              <Input
                className="w-full bg-transparent border-none shadow-none h-auto py-2.5 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-neutral-400"
                placeholder="Scrivi un messaggio..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                autoComplete="off"
              />
            </div>
            <Button
              onClick={handleSendMessage}
              className="ml-2 text-white rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#007BFF" }}
              disabled={!newMessage.trim()}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
