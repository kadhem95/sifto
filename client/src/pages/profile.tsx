import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Rating } from "@/components/ui/rating";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Camera, UserCircle, Upload, UserIcon } from "lucide-react";
import { signOut, getAuth, updateProfile, deleteUser } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, limit, updateDoc, doc, addDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { uploadProfilePicture } from "@/lib/simpleImageUpload";

export default function Profile() {
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

    // Assicuriamoci di avere sempre il nome utente più recente
    setUserName(currentUser.displayName || "");
    
    if (userProfile) {
      setUserName(userProfile.displayName || currentUser.displayName || "");
    }

    const fetchData = async () => {
      try {
        // Fetch reviews
        const reviewsQuery = query(
          collection(db, "reviews"),
          where("receiverId", "==", currentUser.uid),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        
        const reviewsData = await Promise.all(
          reviewsSnapshot.docs.map(async (doc) => {
            const reviewData = doc.data();
            
            // Get sender info
            const userQuery = query(
              collection(db, "users"),
              where("uid", "==", reviewData.senderId)
            );
            const userSnapshot = await getDocs(userQuery);
            
            const userData = !userSnapshot.empty ? userSnapshot.docs[0].data() : null;
            
            return {
              id: doc.id,
              ...reviewData,
              sender: userData ? {
                name: userData.displayName || "Unknown",
                photoURL: userData.photoURL
              } : null
            };
          })
        );
        
        setReviews(reviewsData);
        
        // Fetch stats
        const packagesQuery = query(
          collection(db, "packages"),
          where("userId", "==", currentUser.uid)
        );
        const packagesSnapshot = await getDocs(packagesQuery);
        
        const tripsQuery = query(
          collection(db, "trips"),
          where("userId", "==", currentUser.uid)
        );
        const tripsSnapshot = await getDocs(tripsQuery);
        
        // Calculate total spent on packages
        const totalSpent = packagesSnapshot.docs.reduce((sum, doc) => {
          const packageData = doc.data();
          return sum + (packageData.price || 0);
        }, 0);
        
        // Calculate total earned from trips with completed matches
        let totalEarned = 0;
        for (const tripDoc of tripsSnapshot.docs) {
          const matchesQuery = query(
            collection(db, "matches"),
            where("tripId", "==", tripDoc.id),
            where("status", "==", "completed")
          );
          const matchesSnapshot = await getDocs(matchesQuery);
          
          for (const matchDoc of matchesSnapshot.docs) {
            const matchData = matchDoc.data();
            
            const packageQuery = query(
              collection(db, "packages"),
              where("__name__", "==", matchData.packageId)
            );
            const packageSnapshot = await getDocs(packageQuery);
            
            if (!packageSnapshot.empty) {
              const packageData = packageSnapshot.docs[0].data();
              totalEarned += packageData.price || 0;
            }
          }
        }
        
        setStats({
          packagesSent: packagesSnapshot.size,
          tripsReported: tripsSnapshot.size,
          totalEarned,
          totalSpent
        });
        
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };

    fetchData();
  }, [currentUser, navigate, userProfile]);

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
      if (userName.trim() && userName !== userProfile?.displayName) {
        const trimmedName = userName.trim();
        
        // Prima aggiorniamo il profilo utente in Firebase Auth
        await updateProfile(currentUser, {
          displayName: trimmedName
        });
        console.log("Nome aggiornato in Firebase Auth:", trimmedName);
        
        // Aggiorniamo anche il database Firestore per garantire la coerenza dei dati
        try {
          // Cerca il documento utente in Firestore
          const usersQuery = query(
            collection(db, "users"),
            where("uid", "==", currentUser.uid)
          );
          const userSnapshot = await getDocs(usersQuery);
          
          if (!userSnapshot.empty) {
            // Se troviamo il documento utente, aggiorniamo il displayName
            const userDoc = userSnapshot.docs[0];
            await updateDoc(doc(db, "users", userDoc.id), {
              displayName: trimmedName,
              updatedAt: new Date().toISOString()
            });
            
            console.log("Profilo utente aggiornato in Firestore con successo:", trimmedName);
            
            // Forza l'aggiornamento immediato dell'interfaccia utente
            // per mostrare subito il nuovo nome
            if (userProfile) {
              // Aggiorniamo localmente il nome per un feedback immediato
              setUserName(trimmedName);
            }
          } else {
            console.log("Documento utente non trovato, lo creiamo");
            // Se il documento non esiste in Firestore, lo creiamo
            await addDoc(collection(db, "users"), {
              uid: currentUser.uid,
              displayName: trimmedName,
              email: currentUser.email,
              photoURL: currentUser.photoURL,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              rating: 0,
              reviewCount: 0
            });
            console.log("Nuovo profilo utente creato in Firestore");
          }
        } catch (firestoreError) {
          console.error("Errore nell'aggiornamento del profilo su Firestore:", firestoreError);
          // Non blocchiamo il flusso principale se fallisce l'aggiornamento del database
        }
        
        toast({
          title: "Profilo aggiornato",
          description: "Il tuo nome è stato aggiornato con successo.",
          duration: 3000
        });
        
        // Attendiamo che l'utente venga aggiornato e forziamo un aggiornamento della pagina
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
  
  // Funzione per gestire il click sul bottone di upload dell'immagine
  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  // Funzione per gestire il caricamento dell'immagine di profilo
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) {
      toast({
        title: "Errore",
        description: "Devi essere loggato per cambiare l'immagine del profilo",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    
    const files = event.target.files;
    if (!files || files.length === 0) {
      console.log("Nessun file selezionato");
      return;
    }
    
    setIsUploadingImage(true);
    
    try {
      const file = files[0];
      
      // Verifica che sia un'immagine
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Formato non supportato",
          description: "Per favore seleziona un'immagine (JPG, PNG, GIF)",
          variant: "destructive",
          duration: 3000
        });
        setIsUploadingImage(false);
        return;
      }
      
      // Verifica dimensione (max 2MB per maggiore velocità)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        toast({
          title: "Immagine troppo grande",
          description: "Per favore seleziona un'immagine di dimensioni inferiori a 2MB",
          variant: "destructive",
          duration: 3000
        });
        setIsUploadingImage(false);
        return;
      }
      
      // Mostriamo un messaggio di caricamento in corso
      toast({
        title: "Caricamento in corso",
        description: "Stiamo caricando la tua immagine...",
        duration: 3000
      });
      
      // Utilizziamo la nuova funzione semplificata per caricare l'immagine
      const downloadURL = await uploadProfilePicture(file);
      
      toast({
        title: "Immagine aggiornata",
        description: "La tua immagine del profilo è stata caricata con successo!",
        duration: 3000
      });
      
      // Forziamo un refresh della pagina per vedere subito la nuova immagine
      window.location.reload();
      
    } catch (error) {
      console.error("Errore durante il caricamento dell'immagine:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un problema durante il caricamento dell'immagine. Riprova più tardi.",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsUploadingImage(false);
      // Reset del campo file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Utilizziamo immagini caricate dall'utente

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
    if (!timestamp) return "Unknown date";
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return "Invalid date";
    }
  };

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6">Profilo</h1>

        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-6">
          <div className="p-6 flex flex-col items-center">
            {/* Avatar con overlay per il caricamento dell'immagine */}
            <div className="relative">
              <Avatar className="w-24 h-24 mb-4 border border-neutral-200">
                <AvatarImage 
                  src={userProfile?.photoURL || currentUser?.photoURL || ''}
                  alt={userName}
                  className="object-cover"
                  onError={(e) => {
                    console.log("Errore nel caricamento dell'immagine profilo");
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xl font-medium">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {/* Bottoni per gestire l'immagine del profilo */}
              <div className="absolute bottom-0 right-0 flex">
                {/* Rimuoviamo il bottone per generare avatar e lasciamo solo quello per caricare immagine */}
                
                {/* Bottone per caricare un'immagine */}
                <button 
                  className="bg-primary text-white rounded-full p-2 shadow-md hover:bg-primary/90 transition-colors"
                  onClick={handleImageButtonClick}
                  disabled={isUploadingImage}
                  title="Carica foto del profilo"
                >
                  {isUploadingImage ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Camera size={16} />
                  )}
                </button>
              </div>
              
              {/* Input file nascosto */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            
            {isEditing ? (
              <div className="w-full max-w-xs mb-4">
                <label htmlFor="profile-name" className="block text-sm text-neutral-500 mb-1 text-center">
                  Il tuo nome
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-neutral-100 rounded-lg px-4 py-2 border border-neutral-300 text-center mb-3"
                  placeholder="Inserisci il tuo nome"
                  maxLength={50}
                />
                <div className="flex justify-center space-x-3">
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    className="px-4"
                    disabled={isLoading}
                  >
                    Annulla
                  </Button>
                  <Button
                    onClick={handleUpdateProfile}
                    className="px-4 bg-primary text-white"
                    disabled={isLoading || !userName.trim()}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Salvataggio...
                      </div>
                    ) : (
                      "Salva"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-neutral-900 mb-1">{userName || "Utente"}</h2>
                <p className="text-neutral-500 mb-2">{currentUser?.phoneNumber || currentUser?.email}</p>
                <div className="flex items-center mb-4">
                  <Rating value={userProfile?.rating || 0} readOnly size="sm" />
                  <span className="text-sm text-neutral-500 ml-1">
                    {userProfile?.rating?.toFixed(1) || "0.0"} ({userProfile?.reviewCount || 0} recensioni)
                  </span>
                </div>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  Modifica Nome
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-6">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Statistiche attività</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-50 p-3 rounded-lg">
                <p className="text-neutral-500 text-sm">Pacchi inviati</p>
                <p className="text-xl font-semibold text-neutral-900">{stats.packagesSent}</p>
              </div>
              <div className="bg-neutral-50 p-3 rounded-lg">
                <p className="text-neutral-500 text-sm">Viaggi segnalati</p>
                <p className="text-xl font-semibold text-neutral-900">{stats.tripsReported}</p>
              </div>
              <div className="bg-neutral-50 p-3 rounded-lg">
                <p className="text-neutral-500 text-sm">Totale guadagnato</p>
                <p className="text-xl font-semibold text-neutral-900">€{stats.totalEarned.toFixed(2)}</p>
              </div>
              <div className="bg-neutral-50 p-3 rounded-lg">
                <p className="text-neutral-500 text-sm">Totale speso</p>
                <p className="text-xl font-semibold text-neutral-900">€{stats.totalSpent.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-6">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Ultime recensioni ricevute</h3>
            
            {reviews.length > 0 ? (
              <div className="space-y-4 mt-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-neutral-200 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center mb-2">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage src={review.sender?.photoURL} />
                        <AvatarFallback className="bg-primary text-white">
                          {review.sender?.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{review.sender?.name}</p>
                        <div className="flex items-center">
                          <Rating value={review.rating} readOnly size="sm" />
                          <span className="text-xs text-neutral-500 ml-1">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-neutral-700">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-neutral-500">
                <p>Non hai ancora ricevuto recensioni</p>
                <p className="text-sm mt-1">Completa più spedizioni per ricevere feedback</p>
              </div>
            )}
          </div>
        </div>

        <Button 
          onClick={() => setShowLogoutConfirm(true)}
          variant="outline" 
          className="w-full border-red-300 text-red-600 hover:bg-red-50"
        >
          Esci dall'account
        </Button>
        
        <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma logout</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicuro di voler uscire dall'account? Dovrai effettuare nuovamente l'accesso per utilizzare l'app.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Esci
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}