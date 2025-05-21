import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export type MessageType = "text" | "location" | "quickAction";

interface MessageProps {
  content: string;
  timestamp: string;
  isSender: boolean;
  type?: MessageType;
  senderAvatar?: string;
  senderName?: string;
}

export default function MessageItem({
  content,
  timestamp,
  isSender,
  type = "text",
  senderAvatar,
  senderName,
}: MessageProps) {
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, "HH:mm");
    } catch (error) {
      return "--:--";
    }
  };

  const renderMessageContent = () => {
    switch (type) {
      case "location":
        return (
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{content}</span>
          </div>
        );
      case "quickAction":
        if (content.startsWith("📍")) {
          return <div className="font-medium">{content}</div>;
        } else if (content.startsWith("💸")) {
          return <div className="font-medium">{content}</div>;
        } else if (content.startsWith("📦")) {
          return <div className="font-medium">{content}</div>;
        }
        return <div>{content}</div>;
      default:
        return <div className="break-words">{content}</div>;
    }
  };

  return (
    <div className={`flex ${isSender ? "justify-end" : "justify-start"} mb-2 mx-1`}>
      {!isSender && senderAvatar && (
        <Avatar className="w-7 h-7 mr-1.5 mt-1 flex-shrink-0">
          <AvatarImage src={senderAvatar} alt={senderName || "User"} />
          <AvatarFallback>{senderName?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
      )}
      <div
        style={{ 
          backgroundColor: isSender ? "#007BFF" : "#E5E5EA",
          maxWidth: "75%",
          wordBreak: "break-word"
        }}
        className={`py-2 px-3 relative ${
          isSender
            ? "text-white rounded-2xl rounded-tr-sm"
            : "text-neutral-800 rounded-2xl rounded-tl-sm"
        }`}
      >
        {renderMessageContent()}
        <div 
          className={`text-right text-[10px] ${
            isSender ? "text-white/80" : "text-neutral-500"
          } mt-0.5 ml-2 inline-block float-right`}
        >
          {formatTime(timestamp)}
        </div>
      </div>
    </div>
  );
}
