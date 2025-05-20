import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Camera, UserCircle, Edit2, LogOut } from "lucide-react";
import { signOut, getAuth, updateProfile } from "firebase/auth";

export default function ProfileNew() {
  const [, navigate] = useLocation();
  const { currentUser, userProfile } = useAuth();
  const [userName, setUserName] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState({
    packagesSent: 0,
    tripsReported: 0,
    totalEarned: 0,
    totalSpent: 0,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    setUserName(currentUser.displayName || "");
    
    // In un ambiente di produzione qui faremmo delle chiamate API per ottenere
    // le statistiche dell'utente e le recensioni
    
    // Mock data per la demo
    setStats({
      packagesSent: 5,
      tripsReported: 3,
      totalEarned: 120,
      totalSpent: 85
    });
    
    setReviews([
      {
        id: '1',
        sender: {
          name: 'Marco Rossi',
          photoURL: null
        },
        rating: 5,
        comment: 'Ottimo servizio, pacchetto consegnato in perfette condizioni!',
        createdAt: new Date()
      },
      {
        id: '2',
        sender: {
          name: 'Giulia Bianchi',
          photoURL: null
        },
        rating: 4,
        comment: 'Puntuale e affidabile, consigliato!',
        createdAt: new Date()
      }
    ]);
  }, [currentUser, navigate]);

  const handleUpdateProfile = async () => {
    if (!currentUser) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato per aggiornare il profilo.",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (userName.trim() && userName !== currentUser.displayName) {
        // Aggiorna solo il profilo utente in Firebase Auth
        await updateProfile(currentUser, {
          displayName: userName.trim()
        });
        
        toast({
          title: "Profilo aggiornato",
          description: "Il tuo nome è stato aggiornato con successo.",
          duration: 3000
        });
        
        // Forza un aggiornamento della pagina dopo un breve ritardo
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error("Errore nell'aggiornamento del profilo:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento del profilo. Riprova più tardi.",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !currentUser) return;
    
    const file = files[0];
    
    // Controllo delle dimensioni (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File troppo grande",
        description: "L'immagine non deve superare i 5MB.",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    
    // Controllo del tipo di file
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Formato non supportato",
        description: "Per favore carica un'immagine in formato JPG, PNG o GIF.",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    
    setIsUploadingImage(true);
    
    try {
      // Creiamo un URL temporaneo per l'immagine caricata
      const imageUrl = URL.createObjectURL(file);
      
      // Aggiorniamo il profilo utente
      await updateProfile(currentUser, {
        photoURL: imageUrl
      });
      
      toast({
        title: "Immagine aggiornata",
        description: "La tua immagine del profilo è stata aggiornata.",
        duration: 3000
      });
      
      // Pulizia del campo input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Forza un aggiornamento della pagina dopo un breve ritardo
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error("Errore durante l'aggiornamento dell'immagine:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento dell'immagine. Riprova più tardi.",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Data sconosciuta";
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('it-IT', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
    } catch (e) {
      return "Data non valida";
    }
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-secondary">Il mio Profilo</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-6">
          {/* Header con background gradient */}
          <div className="bg-gradient-to-r from-primary/20 to-secondary/20 h-24 relative">
            <div className="absolute -bottom-12 left-6">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-white shadow">
                  {currentUser?.photoURL ? (
                    <AvatarImage src={currentUser.photoURL} alt={currentUser.displayName || "Utente"} />
                  ) : (
                    <AvatarFallback className="bg-primary/10">
                      <UserCircle className="w-full h-full text-primary" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <button
                  className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg"
                  onClick={handleImageButtonClick}
                  disabled={isUploadingImage}
                  aria-label="Cambia immagine profilo"
                >
                  {isUploadingImage ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Camera size={20} />
                  )}
                </button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  ref={fileInputRef}
                />
              </div>
            </div>
          </div>

          {/* Contenuto profilo */}
          <div className="pt-14 px-6 pb-6">
            {isEditing ? (
              <div className="flex items-center mb-4 w-full max-w-xs">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Il tuo nome"
                  autoFocus
                />
                <Button
                  variant="default"
                  className="ml-2 bg-primary text-white hover:bg-primary/90"
                  onClick={handleUpdateProfile}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Salva"
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center mb-3">
                <h2 className="text-xl font-semibold text-neutral-900">
                  {currentUser?.displayName || "Utente"}
                </h2>
                <button
                  className="ml-2 text-primary p-1 rounded-full hover:bg-primary/10"
                  onClick={() => {
                    setUserName(currentUser?.displayName || "");
                    setIsEditing(true);
                  }}
                  aria-label="Modifica nome"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}

            <div className="flex items-center mb-5">
              <Rating value={userProfile?.rating || 0} readOnly />
              <span className="ml-2 text-sm text-neutral-600">
                {userProfile?.rating ? userProfile.rating.toFixed(1) : "0.0"} ({userProfile?.reviewCount || 0} recensioni)
              </span>
            </div>

            {/* Statistiche utente */}
            <div className="grid grid-cols-2 gap-4 w-full mb-6">
              <div className="bg-primary/5 p-3 rounded-lg text-center">
                <p className="text-sm text-neutral-600">Pacchi inviati</p>
                <p className="text-xl font-semibold text-secondary">{stats.packagesSent}</p>
              </div>
              <div className="bg-secondary/5 p-3 rounded-lg text-center">
                <p className="text-sm text-neutral-600">Viaggi segnalati</p>
                <p className="text-xl font-semibold text-secondary">{stats.tripsReported}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <p className="text-sm text-neutral-600">Totale guadagnato</p>
                <p className="text-xl font-semibold text-green-600">€{stats.totalEarned.toFixed(2)}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <p className="text-sm text-neutral-600">Totale speso</p>
                <p className="text-xl font-semibold text-red-600">€{stats.totalSpent.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Pulsante di logout */}
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2 text-secondary border-secondary/30 hover:bg-secondary/5"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <LogOut size={16} />
              <span>Esci dall'account</span>
            </Button>
          </div>
        </div>

        {/* Recensioni */}
        {reviews.length > 0 && (
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-6">
            <div className="p-5">
              <h3 className="text-lg font-semibold text-secondary mb-4">Recensioni ricevute</h3>
              
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-neutral-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={review.sender?.photoURL} alt={review.sender?.name} />
                        <AvatarFallback className="bg-primary/10">
                          {review.sender?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-neutral-900">{review.sender?.name || "Utente"}</p>
                            <div className="flex items-center">
                              <Rating value={review.rating} readOnly />
                              <span className="text-xs text-neutral-500 ml-2">
                                {formatDate(review.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-neutral-700 mt-2 text-sm">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Informazioni legali */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-6">
          <div className="p-5">
            <h3 className="text-lg font-semibold text-secondary mb-3">Informazioni legali</h3>
            <div className="text-sm text-neutral-600 space-y-3">
              <p>
                <strong className="font-medium text-neutral-800">Disclaimer:</strong> Jibli non è responsabile del contenuto dei pacchi. Gli utenti sono gli unici responsabili di garantire che i loro pacchi rispettino tutte le leggi e i regolamenti applicabili.
              </p>
              <p>
                <strong className="font-medium text-neutral-800">Privacy Policy:</strong> Raccogliamo le informazioni personali minime necessarie per fornire il nostro servizio. I tuoi dati sono protetti e mai condivisi con terze parti.
              </p>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di voler uscire?</AlertDialogTitle>
            <AlertDialogDescription>
              Dovrai accedere nuovamente per utilizzare l'app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout} 
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Esci
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}