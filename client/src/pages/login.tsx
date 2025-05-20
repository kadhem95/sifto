import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { loginWithEmail, registerWithEmail } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [, navigate] = useLocation();
  const { setCurrentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      if (isRegister) {
        // Register new user
        const user = await registerWithEmail({ email, password, displayName });
        setCurrentUser(user);
        navigate("/");
      } else {
        // Login existing user
        const user = await loginWithEmail(email, password);
        setCurrentUser(user);
        navigate("/");
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      setError(error.message || "Si è verificato un errore. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError("");
  };

  return (
    <div className="h-full flex flex-col justify-between p-6 min-h-screen bg-gradient-to-b from-accent to-background">
      <div className="flex flex-col items-center justify-center mt-8">
        <div className="w-28 h-28 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-6 overflow-hidden">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-20 w-20"
            viewBox="0 0 24 24"
            fill="none"
          >
            {/* S stilizzata che richiama un tragitto/strada curva - ancora più minimale */}
            <path 
              d="M8 9C8 7 10 5 13 5C16 5 17 7 17 9C17 11 14 12 12 13C10 14 7 15 7 17C7 19 9 21 12 21C15 21 16 19 16 17" 
              stroke="url(#gradient)"
              fill="none"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Definizione del gradiente blu-azzurro */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0077B6" />
                <stop offset="100%" stopColor="#00B4D8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">SIFTO</h1>
        <p className="text-neutral-600 text-center font-medium mb-8">
          Il tuo pacco trova un passaggio
        </p>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 border border-accent">
          <h2 className="text-2xl font-bold text-primary mb-6 text-center">
            {isRegister ? "Crea il tuo account" : "Bentornato su SIFTO"}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-neutral-700 font-medium">Nome utente</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Il tuo nome completo"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={isRegister}
                  className="rounded-xl py-3 px-4 bg-accent/50 border-accent/80 focus:border-primary focus:ring-primary"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-700 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="La tua email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl py-3 px-4 bg-accent/50 border-accent/80 focus:border-primary focus:ring-primary"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-700 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimo 6 caratteri"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="rounded-xl py-3 px-4 bg-accent/50 border-accent/80 focus:border-primary focus:ring-primary"
              />
            </div>
            
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 rounded-xl py-6 h-auto font-bold text-lg mt-4" 
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Caricamento...
                </div>
              ) : (
                isRegister ? "Crea account" : "Accedi"
              )}
            </Button>
          </form>
          
          <div className="mt-8 text-center">
            <button 
              type="button"
              onClick={toggleMode}
              className="text-primary font-medium hover:text-secondary transition-colors"
            >
              {isRegister 
                ? "Hai già un account? Accedi" 
                : "Non hai un account? Registrati"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
