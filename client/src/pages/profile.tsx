import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { signOut, getAuth, updateProfile, deleteUser } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const [, navigate] = useLocation();
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [userName, setUserName] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState({
    packagesSent: 0,
    tripsReported: 0,
    totalEarned: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    if (userProfile) {
      setUserName(userProfile.displayName || "");
    }

    const fetchData = async () => {
      try {
        // Fetch reviews con gestione dell'errore di indice
        try {
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
                  name: userData.displayName || "Sconosciuto",
                  photoURL: userData.photoURL
                } : null
              };
            })
          );
          
          setReviews(reviewsData);
        } catch (reviewError: any) {
          console.error("Errore nel caricamento delle recensioni:", reviewError);
          
          // Controlla se l'errore è dovuto alla mancanza di un indice
          if (reviewError.code === 'failed-precondition' && reviewError.message.includes('index')) {
            console.log("Questo errore è dovuto alla mancanza di un indice in Firestore");
            
            // Estrai l'URL per la creazione dell'indice dal messaggio di errore, se presente
            const errorMsg = reviewError.message || "";
            const urlMatch = errorMsg.match(/(https:\/\/console\.firebase\.google\.com\S+)/);
            const indexUrl = urlMatch ? urlMatch[1] : null;
            
            // Mostra l'errore completo nella console per facilitare il debugging
            console.error("Messaggio completo dell'errore:", errorMsg);
            if (indexUrl) {
              console.log("URL per creare l'indice:", indexUrl);
            }
            
            // Alert più dettagliato per mostrare il link all'utente
            // Nota: in una versione di produzione, potresti voler implementare un componente UI dedicato
            if (indexUrl) {
              const confirmCreate = window.confirm(
                "È necessario creare un indice in Firestore per visualizzare le recensioni. "+
                "Vuoi aprire il link per crearlo ora? (Dopo aver creato l'indice, ricarica la pagina)"
              );
              if (confirmCreate) {
                window.open(indexUrl, '_blank');
              }
            } else {
              // Fallback se l'URL non viene trovato
              toast({
                title: "Indice Firestore mancante",
                description: "È necessario creare un indice composito su Firestore per visualizzare le recensioni. Controlla la console per i dettagli.",
                variant: "default",
              });
            }
          }
          
          // Imposta recensioni vuote in caso di errore
          setReviews([]);
        }
        
        // Fetch stats in blocchi separati per robustezza
        try {
          // Pacchetti inviati
          const packagesQuery = query(
            collection(db, "packages"),
            where("userId", "==", currentUser.uid)
          );
          const packagesSnapshot = await getDocs(packagesQuery);
          
          // Viaggi segnalati
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
          
          // Initialize total earned
          let totalEarned = 0;
          
          // Try calculating earnings, handle with care due to complex queries
          try {
            // Calculate total earned from trips with completed matches
            for (const tripDoc of tripsSnapshot.docs) {
              try {
                const matchesQuery = query(
                  collection(db, "matches"),
                  where("tripId", "==", tripDoc.id),
                  where("status", "==", "completed")
                );
                const matchesSnapshot = await getDocs(matchesQuery);
                
                for (const matchDoc of matchesSnapshot.docs) {
                  try {
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
                  } catch (packageError) {
                    console.error("Errore nel recupero dati pacchetto:", packageError);
                    // Continue with next match
                  }
                }
              } catch (matchError) {
                console.error("Errore nel recupero match:", matchError);
                // Continue with next trip
              }
            }
          } catch (earningsError) {
            console.error("Errore nel calcolo guadagni:", earningsError);
            // Use 0 as fallback for earnings
          }
          
          setStats({
            packagesSent: packagesSnapshot.size,
            tripsReported: tripsSnapshot.size,
            totalEarned,
            totalSpent
          });
        } catch (statsError) {
          console.error("Errore nel recupero statistiche:", statsError);
          setStats({
            packagesSent: 0,
            tripsReported: 0,
            totalEarned: 0,
            totalSpent: 0
          });
        }
        
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };

    fetchData();
  }, [currentUser, navigate, userProfile, toast]);

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    
    try {
      if (userName.trim() && userName !== userProfile?.displayName) {
        // Aggiorna il nome nell'autenticazione Firebase
        await updateProfile(currentUser, {
          displayName: userName.trim()
        });
        
        // Aggiorna il nome nel profilo Firestore
        const userQuery = query(
          collection(db, "users"),
          where("uid", "==", currentUser.uid)
        );
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          // Aggiorna il documento esistente
          const userDoc = userSnapshot.docs[0];
          await updateDoc(doc(db, "users", userDoc.id), {
            displayName: userName.trim()
          });
        } else {
          // Crea un nuovo documento utente se non esiste
          await addDoc(collection(db, "users"), {
            uid: currentUser.uid,
            displayName: userName.trim(),
            createdAt: new Date().toISOString(),
            rating: 0,
            reviewCount: 0
          });
        }
        
        // Mostra un messaggio di conferma con toast
        toast({
          title: "Profilo aggiornato",
          description: "Il tuo nome è stato salvato correttamente",
          variant: "default"
        });
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un problema durante il salvataggio del profilo",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione semplificata per gestire l'upload dell'immagine del profilo
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;
    
    // Reset dell'input file per consentire la selezione dello stesso file
    event.target.value = "";
    
    setIsUploadingImage(true);
    console.log("Inizio upload immagine...");
    
    try {
      // Controllo dimensioni file (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("L'immagine è troppo grande. Dimensione massima: 5MB");
      }
      
      // Crea un riferimento allo storage con un nome file unico
      const fileName = `profile_${currentUser.uid}_${Date.now()}`;
      const storageRef = ref(storage, `profile_images/${fileName}`);
      
      console.log("Caricamento file su Firebase Storage...");
      
      // Carica il file con un metodo sincrono standard per massima compatibilità
      const snapshot = await uploadBytes(storageRef, file);
      console.log("Upload completato con successo:", snapshot.metadata.name);
      
      // Ottieni l'URL di download
      console.log("Ottenimento URL di download...");
      const downloadURL = await getDownloadURL(storageRef);
      console.log("URL ottenuto:", downloadURL);
      
      // Verifica che l'URL sia valido
      if (!downloadURL) {
        throw new Error("URL di download non valido");
      }
      
      // Aggiorna l'URL della foto nel profilo di autenticazione
      console.log("Aggiornamento profilo autenticazione...");
      await updateProfile(currentUser, {
        photoURL: downloadURL
      });
      
      // Aggiorna anche nel database Firestore
      console.log("Aggiornamento database Firestore...");
      const userQuery = query(
        collection(db, "users"),
        where("uid", "==", currentUser.uid)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        // Aggiorna il documento esistente
        const userDoc = userSnapshot.docs[0];
        await updateDoc(doc(db, "users", userDoc.id), {
          photoURL: downloadURL
        });
        console.log("Documento Firestore aggiornato");
      } else {
        // Se l'utente non esiste nel database, crealo
        const newUserDoc = await addDoc(collection(db, "users"), {
          uid: currentUser.uid,
          displayName: currentUser.displayName || "",
          photoURL: downloadURL,
          createdAt: new Date().toISOString(),
          rating: 0,
          reviewCount: 0
        });
        console.log("Nuovo documento Firestore creato:", newUserDoc.id);
      }
      
      // Aggiorna manualmente l'immagine nell'interfaccia utente
      const avatarImage = document.querySelector('.avatar-image') as HTMLImageElement;
      if (avatarImage) {
        // Imposta un timestamp casuale per evitare il caching
        avatarImage.src = `${downloadURL}?t=${Date.now()}`;
        console.log("Immagine profilo aggiornata nell'interfaccia");
      }
      
      // Mostra un messaggio di conferma
      toast({
        title: "Immagine caricata",
        description: "La tua immagine del profilo è stata aggiornata con successo",
        variant: "default"
      });
      
    } catch (error: any) {
      console.error("Errore durante il caricamento dell'immagine:", error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un problema durante il caricamento dell'immagine",
        variant: "destructive"
      });
    } finally {
      setIsUploadingImage(false);
    }
  };
  
  // Funzione per aprire il selettore di file
  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
            <div className="relative group cursor-pointer" onClick={triggerFileInput}>
              <Avatar className="w-24 h-24 mb-4 border-2 border-white">
                <AvatarImage 
                  src={currentUser?.photoURL || undefined} 
                  alt={userName}
                  className="object-cover avatar-image" 
                />
                <AvatarFallback className="bg-primary text-white text-xl font-semibold">
                  {userName.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              
              {/* Overlay con icona ed effetto al passaggio del mouse */}
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              
              {/* Indicatore di caricamento */}
              {isUploadingImage && (
                <div className="absolute inset-0 bg-black bg-opacity-70 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            
            {/* Input file nascosto */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
              accept="image/*"
              disabled={isUploadingImage}
            />
            
            {/* Suggerimento per l'utente */}
            <p className="text-xs text-neutral-500 mb-2 text-center">
              Tocca l'immagine per caricare una foto
            </p>
            
            {isEditing ? (
              <div className="w-full max-w-xs mb-4">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-neutral-100 rounded-lg px-4 py-2 border border-neutral-300 text-center mb-2"
                />
                <div className="flex justify-center space-x-2">
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
                    disabled={isLoading}
                  >
                    {isLoading ? "Salvataggio..." : "Salva"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-neutral-900 mb-1">{userName || "User"}</h2>
                <p className="text-neutral-500 mb-2">{currentUser?.phoneNumber}</p>
                <div className="flex items-center mb-4">
                  <Rating value={userProfile?.rating || 0} readOnly size="sm" />
                  <span className="text-sm text-neutral-500 ml-1">
                    {userProfile?.rating?.toFixed(1) || "0.0"} ({userProfile?.reviewCount || 0} recensioni)
                  </span>
                </div>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="text-neutral-700 bg-neutral-100"
                >
                  Modifica Profilo
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
                <p className="text-xl font-semibold text-secondary">{stats.totalEarned}€</p>
              </div>
              <div className="bg-neutral-50 p-3 rounded-lg">
                <p className="text-neutral-500 text-sm">Totale speso</p>
                <p className="text-xl font-semibold text-primary">{stats.totalSpent}€</p>
              </div>
            </div>
          </div>
        </div>

        {reviews.length > 0 && (
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-6">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Recensioni recenti</h3>
              
              {reviews.map((review) => (
                <div key={review.id} className="mb-4 border-b border-neutral-100 pb-4 last:border-0 last:mb-0 last:pb-0">
                  <div className="flex items-start">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={review.sender?.photoURL} alt={review.sender?.name} />
                      <AvatarFallback>{review.sender?.name.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-neutral-900">{review.sender?.name || "Anonymous"}</p>
                          <div className="flex items-center">
                            <Rating value={review.rating} readOnly size="sm" />
                            <span className="text-xs text-neutral-500 ml-2">
                              {formatDate(review.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-neutral-700 mt-1 text-sm">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-6">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Informazioni legali</h3>
            <div className="text-sm text-neutral-500 space-y-3">
              <p>
                <strong className="font-medium text-neutral-700">Disclaimer:</strong> PackShare non è responsabile del contenuto dei pacchi. Gli utenti sono gli unici responsabili di garantire che i loro pacchi rispettino tutte le leggi e i regolamenti applicabili.
              </p>
              <p>
                <strong className="font-medium text-neutral-700">Privacy Policy:</strong> Raccogliamo le informazioni personali minime necessarie per fornire il nostro servizio. I tuoi dati sono protetti e mai condivisi con terze parti.
              </p>
              <p>
                <strong className="font-medium text-neutral-700">Termini di Servizio:</strong> Utilizzando PackShare, accetti i nostri termini che includono un comportamento rispettoso verso gli altri utenti e il non utilizzo improprio della piattaforma.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full bg-neutral-100 text-neutral-700 font-medium rounded-lg py-4 h-auto mb-4"
        >
          Disconnetti
        </Button>

        <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sei sicuro di voler uscire?</AlertDialogTitle>
              <AlertDialogDescription>
                Dovrai accedere nuovamente con il tuo numero di telefono per accedere al tuo account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout}>Disconnetti</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
