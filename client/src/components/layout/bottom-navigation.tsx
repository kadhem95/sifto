import { useLocation, Link } from "wouter";

export default function BottomNavigation() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path ? "text-primary" : "text-neutral-500";
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 flex items-center justify-around p-2 max-w-lg mx-auto">
      <Link href="/">
        <div className={`flex flex-col items-center p-2 ${isActive("/")} cursor-pointer`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs mt-1">Home</span>
        </div>
      </Link>
      <Link href="/my-shipments">
        <div className={`flex flex-col items-center p-2 ${isActive("/my-shipments")} cursor-pointer`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <span className="text-xs mt-1">Le Mie Attività</span>
        </div>
      </Link>
      <Link href="/messages">
        <div className={`flex flex-col items-center p-2 ${isActive("/messages") || location.startsWith("/chat/") ? "text-primary" : "text-neutral-500"} cursor-pointer`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs mt-1">Messaggi</span>
        </div>
      </Link>
      <Link href="/profile">
        <div className={`flex flex-col items-center p-2 ${isActive("/profile")} cursor-pointer`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs mt-1">Profilo</span>
        </div>
      </Link>
    </div>
  );
}
