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
          return (
            <div className="font-medium">
              <div className="mb-2 text-lg">📍 Punto d'incontro</div>
              <div>{content.replace("📍 Meeting point: ", "")}</div>
            </div>
          );
        } else if (content.startsWith("💸")) {
          return (
            <div className="font-medium">
              <div className="mb-2 text-lg">💸 Conferma prezzo</div>
              <div>{content.replace("💸 ", "")}</div>
            </div>
          );
        } else if (content.startsWith("📦")) {
          return (
            <div className="font-medium">
              <div className="mb-2 text-lg">📦 Consegna completata</div>
              <div>Il pacco è stato consegnato con successo!</div>
              <div className="text-sm mt-2 italic">
                Lascia una recensione per costruire fiducia nella comunità JIBLI
              </div>
            </div>
          );
        }
        return <div>{content}</div>;
      default:
        return <div>{content}</div>;
    }
  };

  return (
    <div className={`flex ${isSender ? "justify-end" : "justify-start"} mb-4`}>
      {!isSender && senderAvatar && (
        <Avatar className="w-8 h-8 mr-2 mt-1 border border-[#4AD8B7]/50">
          <AvatarImage src={senderAvatar} alt={senderName || "Utente"} />
          <AvatarFallback className="bg-[#E9FFF9] text-[#253b6b]">{senderName?.charAt(0) || "J"}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={`p-4 max-w-[80%] shadow-sm ${
          isSender
            ? "bg-[#4AD8B7] text-white rounded-2xl rounded-br-none ml-auto"
            : "bg-white border border-[#4AD8B7]/20 text-[#253b6b] rounded-2xl rounded-bl-none"
        }`}
      >
        {renderMessageContent()}
        <p className={`text-right text-xs ${isSender ? "text-white/80" : "text-[#253b6b]/60"} mt-2`}>
          {formatTime(timestamp)}
        </p>
      </div>
    </div>
  );
}
