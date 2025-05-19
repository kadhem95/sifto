import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelative } from "date-fns";

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
      return formatRelative(date, new Date());
    } catch (error) {
      return "Unknown time";
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
        return <div>{content}</div>;
    }
  };

  return (
    <div className={`flex ${isSender ? "justify-end" : "justify-start"} mb-4`}>
      {!isSender && senderAvatar && (
        <Avatar className="w-8 h-8 mr-2 mt-1">
          <AvatarImage src={senderAvatar} alt={senderName || "User"} />
          <AvatarFallback>{senderName?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={`p-3 max-w-[80%] ${
          isSender
            ? "bg-primary text-white rounded-t-lg rounded-bl-lg ml-auto"
            : "bg-neutral-200 text-neutral-900 rounded-t-lg rounded-br-lg"
        }`}
      >
        {renderMessageContent()}
        <p className={`text-right text-xs ${isSender ? "text-white/70" : "text-neutral-500"} mt-1`}>
          {formatTime(timestamp)}
        </p>
      </div>
    </div>
  );
}
