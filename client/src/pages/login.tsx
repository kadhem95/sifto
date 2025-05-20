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
    <div className="h-full flex flex-col justify-between p-6 min-h-screen">
      <div className="flex flex-col items-center justify-center mt-8">
        <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-14 w-14 text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-5h-1a1 1 0 01-1-1v-1a1 1 0 011-1h1V6a2 2 0 012-2h1.38l-1.73-1.73A1 1 0 0112.22 1h2.07a1 1 0 01.7.29l2.71 2.71a1 1 0 01.29.7 2 2 0 01-2 2H15v8a1 1 0 01-1 1h-.05a2.5 2.5 0 01-4.9 0H3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">PackShare</h1>
        <p className="text-neutral-500 text-center mb-8">
          Connette spedizionieri con viaggiatori
        </p>

        <div className="w-full max-w-md">
          <h2 className="text-xl font-bold text-neutral-900 mb-4">
            {isRegister ? "Registrati" : "Accedi"}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Nome utente</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Il tuo nome"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={isRegister}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="La tua email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="La tua password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Caricamento..." : isRegister ? "Registrati" : "Accedi"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button 
              type="button"
              onClick={toggleMode}
              className="text-primary hover:underline"
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
