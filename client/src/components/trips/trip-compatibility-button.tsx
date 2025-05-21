import { useLocation } from "wouter";

interface TripCompatibilityButtonProps {
  tripId: string;
  className?: string;
}

export default function TripCompatibilityButton({ tripId, className }: TripCompatibilityButtonProps) {
  const [, navigate] = useLocation();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Previene la propagazione dell'evento
    navigate(`/compatible-packages/${tripId}`);
  };

  return (
    <button 
      className={`px-3 py-2 bg-primary text-white rounded-full flex items-center gap-1 hover:bg-primary/90 transition-colors text-sm font-medium ${className || ''}`}
      onClick={handleClick}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
      <span>👉 Trova pacchi compatibili</span>
    </button>
  );
}