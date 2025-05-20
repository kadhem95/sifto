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
        <div className="w-28 h-28 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-lg flex items-center justify-center mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2" />
            <path d="M9 2 L5 8 L13 8 L17 2 z" />
            <path d="M12 13 L12 17" />
            <circle cx="12" cy="13" r="1" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">SIFTO</h1>
        <p className="text-neutral-600 text-center font-medium mb-8">
          Connette spedizionieri con viaggiatori in modo semplice e sicuro
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
