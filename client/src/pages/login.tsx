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
    <div className="h-full flex flex-col justify-between p-6 min-h-screen bg-gradient-to-b from-white to-[#f0fcf9]">
      <div className="flex flex-col items-center justify-center mt-8">
        {/* Logo e titolo JIBLI */}
        <div className="w-28 h-28 rounded-full bg-[#4AD8B7] border-4 border-white shadow-xl flex items-center justify-center mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-5h-1a1 1 0 01-1-1v-1a1 1 0 011-1h1V6a2 2 0 012-2h1.38l-1.73-1.73A1 1 0 0112.22 1h2.07a1 1 0 01.7.29l2.71 2.71a1 1 0 01.29.7 2 2 0 01-2 2H15v8a1 1 0 01-1 1h-.05a2.5 2.5 0 01-4.9 0H3z" />
          </svg>
        </div>
        <h1 className="jibli-logo text-4xl mb-2">JIBLI</h1>
        <p className="text-[#253b6b] text-center mb-2 font-medium">
          Connette persone tra Europa e Maghreb
        </p>
        <p className="text-gray-500 text-center text-sm mb-8 italic">
          "Ogni viaggio è un favore che torna"
        </p>

        <div className="w-full max-w-md bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <h2 className="text-2xl font-bold text-[#253b6b] mb-6 text-center">
            {isRegister ? "Benvenuto nella famiglia!" : "Bentornato fratello!"}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-[#253b6b] font-medium">
                  Come ti chiamano gli amici?
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Il tuo nome"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={isRegister}
                  className="border-[#4AD8B7]/30 focus:border-[#4AD8B7] focus:ring-[#4AD8B7]/20"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#253b6b] font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="La tua email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-[#4AD8B7]/30 focus:border-[#4AD8B7] focus:ring-[#4AD8B7]/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#253b6b] font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="La tua password (minimo 6 caratteri)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="border-[#4AD8B7]/30 focus:border-[#4AD8B7] focus:ring-[#4AD8B7]/20"
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className={isRegister ? "jibli-button-primary w-full py-3" : "jibli-button-secondary w-full py-3"}
              disabled={isLoading}
            >
              {isLoading ? "Caricamento..." : isRegister ? "Unisciti a JIBLI" : "Accedi a JIBLI"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <button 
              type="button"
              onClick={toggleMode}
              className="text-[#4AD8B7] hover:text-[#3fc3a5] font-medium"
            >
              {isRegister 
                ? "Sei già dei nostri? Accedi" 
                : "Prima volta qui? Registrati"}
            </button>
          </div>
        </div>
        
        {/* Disclaimer */}
        <div className="mt-8 text-center text-xs text-gray-500 max-w-sm">
          <p>JIBLI non controlla i pacchi. Fidati di chi viaggia, valuta e scegli con intelligenza.</p>
        </div>
      </div>
    </div>
  );
}
