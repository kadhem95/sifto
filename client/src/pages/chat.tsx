import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import MessageItem, { MessageType } from "@/components/chat/message-item";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { 
  db, 
  sendMessage, 
  getUserProfile,
  createUserProfile,
  auth
} from "@/lib/firebase";
import { 
  doc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  getDoc
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
  
  // Gestione migliorata dello scroll quando l'input è attivo (stile WhatsApp)
  useEffect(() => {
    if (isInputFocused) {
      // Piccolo delay per sincronizzarsi con l'animazione della tastiera
      const timer = setTimeout(() => {
        scrollToBottom(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isInputFocused]);
  
  // Funzione semplice per scroll chat
  const scrollToBottom = (instant = false) => {
    if (!messagesEndRef.current) return;
    
    // Scroll semplice
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
          try {
            // Prima verifichiamo se esiste un profilo, altrimenti lo creiamo automaticamente
            let participantProfile = await getUserProfile(participantId);
            
            // Se il profilo non esiste, creiamolo
            if (!participantProfile) {
              console.log(`Creazione automatica profilo per utente: ${participantId}`);
              
              // Raccogliamo informazioni dall'Auth se disponibili
              const authUser = auth.currentUser?.uid === participantId ? auth.currentUser : null;
              
              // Creiamo un profilo utente base con le informazioni disponibili
              participantProfile = await createUserProfile(participantId, {
                displayName: authUser?.displayName || `Utente (${participantId.slice(0, 6)})`,
                email: authUser?.email || "",
                photoURL: authUser?.photoURL || "",
                phoneNumber: authUser?.phoneNumber || ""
              });
            }
            
            if (participantProfile) {
              // Convertiamo il formato del profilo utente nel formato richiesto da ChatParticipant
              const profileData = participantProfile as any;
              
              // Determiniamo il vero nome dell'utente dalla fonte più affidabile disponibile
              const userDisplayName = profileData.displayName || 
                                     (profileData.phoneNumber ? `${profileData.phoneNumber.slice(-4)}` : 
                                     (profileData.email ? profileData.email.split('@')[0] : participantId.slice(0, 8)));
              
              setParticipant({
                id: profileData.uid || participantId,
                name: userDisplayName,
                photoURL: profileData.photoURL,
                isOnline: false // Disabilitiamo lo stato "online" poiché non possiamo verificarlo in modo affidabile
              });
            }
          } catch (error) {
            console.error("Errore nel recupero/creazione profilo utente:", error);
            
            // Fallback in caso di errore
            setParticipant({
              id: participantId,
              name: `Utente (${participantId.slice(0, 8)}...)`,
              isOnline: false
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

  // Naviga indietro verso la lista delle chat
  const goBackToList = () => {
    // Torna alla lista messaggi
    navigate("/messages");
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
                {/* Rimuoviamo l'indicatore di stato online poiché non possiamo verificarlo */}
                <div className="text-xs text-neutral-500 mt-0.5">
                  {chatDetails?.packageId ? "Mittente pacco" : "Viaggiatore"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Container scrollabile dei messaggi con padding fisso per evitare salti */}
        <div 
          className="flex-1 overflow-y-auto p-2 md:p-3 pt-4 pb-24"
          style={{ backgroundColor: "#F7F7FC" }}
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

        {/* Input box in stile WhatsApp che si solleva sulla tastiera */}
        <div className={`fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-neutral-100 z-10 ${isInputFocused ? 'input-focused' : ''}`}
             style={{ 
               transition: 'transform 0.25s ease-out',
               transform: isInputFocused ? 'translateY(-32px)' : 'translateY(0)'
             }}>          
          {/* Input Area - stile WhatsApp semplificato */}
          <div className="p-3 bg-white flex items-center">
            <div className="flex-1 bg-neutral-100 rounded-full px-4 flex items-center h-12">
              <input
                type="text"
                className="w-full bg-transparent border-none shadow-none h-full focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-neutral-400 outline-none cursor-pointer"
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
