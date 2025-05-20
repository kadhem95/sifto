import { useLocation, Link } from "wouter";
import { Home, Package, MessageCircle, User } from "lucide-react";

export default function BottomNavigation() {
  const [location] = useLocation();

  const getItemStyle = (path: string) => {
    const isItemActive = path === "/" ? location === path : location.startsWith(path);
    return {
      iconClass: isItemActive ? "text-primary" : "text-gray-500",
      textClass: isItemActive ? "text-primary font-medium" : "text-gray-500",
      bgClass: isItemActive ? "bg-primary/10" : ""
    };
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 shadow-lg flex items-center justify-around py-2 px-1 max-w-lg mx-auto">
      <Link href="/">
        <div className={`flex flex-col items-center justify-center rounded-lg ${getItemStyle("/").bgClass} p-2 cursor-pointer w-[20%]`}>
          <Home className={`h-5 w-5 ${getItemStyle("/").iconClass}`} />
          <span className={`text-xs mt-1 ${getItemStyle("/").textClass}`}>Home</span>
        </div>
      </Link>
      
      <Link href="/my-shipments">
        <div className={`flex flex-col items-center justify-center rounded-lg ${getItemStyle("/my-shipments").bgClass} p-2 cursor-pointer w-[20%]`}>
          <Package className={`h-5 w-5 ${getItemStyle("/my-shipments").iconClass}`} />
          <span className={`text-xs mt-1 ${getItemStyle("/my-shipments").textClass}`}>Le Mie Spedizioni</span>
        </div>
      </Link>
      
      <Link href="/chat/list">
        <div className={`flex flex-col items-center justify-center rounded-lg ${getItemStyle("/chat").bgClass} p-2 cursor-pointer w-[20%]`}>
          <MessageCircle className={`h-5 w-5 ${getItemStyle("/chat").iconClass}`} />
          <span className={`text-xs mt-1 ${getItemStyle("/chat").textClass}`}>Messaggi</span>
        </div>
      </Link>
      
      <Link href="/profile">
        <div className={`flex flex-col items-center justify-center rounded-lg ${getItemStyle("/profile").bgClass} p-2 cursor-pointer w-[20%]`}>
          <User className={`h-5 w-5 ${getItemStyle("/profile").iconClass}`} />
          <span className={`text-xs mt-1 ${getItemStyle("/profile").textClass}`}>Profilo</span>
        </div>
      </Link>
    </div>
  );
}
