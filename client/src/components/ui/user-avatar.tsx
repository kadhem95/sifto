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
  
  // Estrai l'iniziale dal nome utente per il fallback
  const getInitial = () => {
    if (!displayName || displayName.trim() === "") return "U";
    
    const nameParts = displayName.trim().split(' ');
    if (nameParts.length >= 2) {
      // Se abbiamo nome e cognome, prendiamo le iniziali
      return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
    }
    // Altrimenti prendiamo la prima lettera
    return displayName.charAt(0).toUpperCase();
  };
  
  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {photoURL ? (
        <AvatarImage 
          src={photoURL} 
          alt={displayName || "Utente"}
          className="object-cover" 
          onError={(e) => {
            console.log("Errore nel caricamento dell'immagine, utilizzo fallback con iniziali");
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-medium">
        {getInitial()}
      </AvatarFallback>
    </Avatar>
  );
}