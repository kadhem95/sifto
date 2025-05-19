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
  getDocs 
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        const participantId = chatRoomData.participants.find(
          (pid: string) => pid !== currentUser.uid
        );
        
        if (participantId) {
          const participantProfile = await getUserProfile(participantId);
          
          if (participantProfile) {
            setParticipant({
              id: participantProfile.uid,
              name: participantProfile.displayName || "Unknown User",
              photoURL: participantProfile.photoURL,
              isOnline: true // For demo purposes, always show as online
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

    const unsubscribe = fetchChatRoom();

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [currentUser, id, navigate]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    
    try {
      await sendMessage(id, currentUser.uid, newMessage);
      setNewMessage("");
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

  const handleDeliveryComplete = () => {
    handleQuickAction("📦 Package delivery complete!");
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
      <div className="h-full flex flex-col">
        <div className="flex items-center p-4 border-b border-neutral-200 bg-white">
          <button className="p-2" onClick={goBackToList}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-neutral-900"
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
            <div className="flex items-center ml-2">
              <Avatar className="w-10 h-10">
                <AvatarImage src={participant.photoURL} alt={participant.name} />
                <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <h3 className="text-neutral-900 font-medium">{participant.name}</h3>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                  <span className="text-xs text-neutral-500">Online</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-neutral-100">
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
            <div className="text-center py-6 text-neutral-500">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <QuickActions
          onMeetingPoint={handleSetMeetingPoint}
          onConfirmPrice={handleConfirmPrice}
          onDeliveryComplete={handleDeliveryComplete}
        />
        
        <div className="p-3 border-t border-neutral-200 bg-white flex items-center">
          <Input
            className="flex-1 bg-neutral-100 rounded-lg px-4 py-3 mx-2 h-auto"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <Button
            onClick={handleSendMessage}
            className="p-2 text-white bg-primary rounded-full h-10 w-10 flex items-center justify-center"
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
    </AppLayout>
  );
}
