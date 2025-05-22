import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  photoURL?: string | null;
  displayName?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Componente Avatar ottimizzato per mostrare sempre una immagine del profilo,
 * con gestione automatica del fallback basato sulle iniziali.
 */
export function UserAvatar({ photoURL, displayName = "Utente", size = "md", className = "" }: UserAvatarProps) {
  // Dimensioni dell'avatar in base alla prop size
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-24 w-24",
  };
  
  // Componente per l'icona utente predefinita
  const DefaultUserIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-3/5 h-3/5 text-white">
      <path 
        d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" 
        fill="currentColor" 
      />
      <path 
        d="M12 12C8.13 12 5 15.13 5 19V21H19V19C19 15.13 15.87 12 12 12Z" 
        fill="currentColor" 
      />
    </svg>
  );
  
  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {photoURL ? (
        <AvatarImage 
          src={photoURL} 
          alt={displayName || "Utente"}
          className="object-cover" 
          onError={(e) => {
            console.log("Errore nel caricamento dell'immagine profilo");
            // Nascondiamo l'immagine se c'è un errore
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      
      {/* 
        Fallback neutro con icona utente invece di iniziali 
        La classe flex è necessaria per centrare l'icona
      */}
      <AvatarFallback className="bg-neutral-500 flex items-center justify-center">
        <DefaultUserIcon />
      </AvatarFallback>
    </Avatar>
  );
}