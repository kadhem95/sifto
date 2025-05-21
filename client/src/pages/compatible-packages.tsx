import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface PackageData {
  id: string;
  from: string;
  to: string;
  deadline: string;
  description: string;
  dimensions?: string;
  price: number;
  imageUrl?: string;
  userId: string;
  userName?: string;
  userPhotoURL?: string;
  userRating?: number;
}

export default function CompatiblePackages() {
  const params = useParams<{ tripId: string }>();
  const tripId = params.tripId;
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [trip, setTrip] = useState<any>(null);
  const [compatiblePackages, setCompatiblePackages] = useState<PackageData[]>([]);

  // Funzione per verificare se un pacco è compatibile con il viaggio
  const isPackageCompatible = (packageData: any, tripData: any) => {
    // Verificare corrispondenza di luogo: stessa origine e stessa destinazione
    const fromMatches = packageData.from === tripData.from;
    const toMatches = packageData.to === tripData.to;
    
    // Verificare che la data di scadenza del pacco sia successiva alla data del viaggio
    const packageDeadline = new Date(packageData.deadline);
    const tripDate = new Date(tripData.date);
    const dateCompatible = packageDeadline >= tripDate;
    
    // Il pacco deve essere ancora in stato "pending" (non accettato da altri viaggiatori)
    const statusCompatible = packageData.status === "pending";
    
    return fromMatches && toMatches && dateCompatible && statusCompatible;
  };

  // Funzione per accettare un pacco
  const handleAcceptPackage = async (packageId: string) => {
    if (!currentUser || !tripId) return;
    
    setIsSending(true);
    
    try {
      // Trovare il pacco compatibile
      const selectedPackage = compatiblePackages.find(p => p.id === packageId);
      
      if (!selectedPackage) {
        toast({
          title: "Errore",
          description: "Pacco non trovato tra quelli compatibili.",
          variant: "destructive"
        });
        return;
      }
      
      // 1. Creare un match tra il viaggio e il pacco
      const matchData = {
        tripId,
        packageId,
        travelerId: currentUser.uid,
        packageOwnerId: selectedPackage.userId,
        status: "accepted",
        createdAt: new Date().toISOString()
      };
      
      const matchRef = await addDoc(collection(db, "matches"), matchData);
      
      // 2. Creare una chat room tra viaggiatore e mittente
      const chatRoomData = {
        users: [currentUser.uid, selectedPackage.userId],
        packageId,
        tripId,
        createdAt: new Date().toISOString()
      };
      
      const chatRoomRef = await addDoc(collection(db, "chatRooms"), chatRoomData);
      
      // 3. Aggiornare lo stato del pacco
      const packageRef = doc(db, "packages", packageId);
      
      try {
        // Prova prima la chiamata API
        await fetch(`/api/packages/${packageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "in_progress" })
        });
      } catch (error) {
        console.error("Errore API, tentativo di update diretto:", error);
        // Fallback: update diretto via Firebase
        // (Questo è necessario perché vedo che le chiamate API stanno fallendo)
        await updateDoc(doc(db, "packages", packageId), {
          status: "in_progress",
          updatedAt: new Date().toISOString()
        });
      }
      
      // 4. Notificare l'utente
      toast({
        title: "Pacco accettato!",
        description: "Hai accettato con successo il pacco. La chat con il mittente è stata creata.",
        variant: "default"
      });
      
      // 5. Reindirizzare direttamente alla chat con il mittente
      setTimeout(() => {
        navigate(`/chat/${selectedPackage.userId}`);
      }, 1000);
    } catch (error) {
      console.error("Errore durante l'accettazione del pacco:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'accettazione del pacco.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    const fetchTripAndCompatiblePackages = async () => {
      if (!currentUser || !tripId) {
        navigate("/my-shipments?tab=trips");
        return;
      }

      setIsLoading(true);

      try {
        // 1. Ottenere i dati del viaggio
        const tripRef = doc(db, "trips", tripId);
        const tripSnap = await getDoc(tripRef);
        
        if (!tripSnap.exists()) {
          toast({
            title: "Viaggio non trovato",
            description: "Il viaggio selezionato non esiste più.",
            variant: "destructive"
          });
          navigate("/my-shipments?tab=trips");
          return;
        }
        
        const tripData = tripSnap.data();
        setTrip({ id: tripId, ...tripData });
        
        // 2. Ottenere tutti i pacchi disponibili (status = pending)
        const packagesQuery = query(
          collection(db, "packages"),
          where("status", "==", "pending")
        );
        const packagesSnapshot = await getDocs(packagesQuery);
        
        // 3. Filtrare i pacchi compatibili
        const packages: PackageData[] = [];
        
        for (const packageDoc of packagesSnapshot.docs) {
          const packageData = packageDoc.data();
          
          // Non mostrare i pacchi dell'utente stesso
          if (packageData.userId === currentUser.uid) {
            continue;
          }
          
          // Verificare compatibilità
          if (isPackageCompatible(packageData, tripData)) {
            // Ottenere i dati dell'utente
            const userQuery = query(
              collection(db, "users"),
              where("uid", "==", packageData.userId)
            );
            const userSnapshot = await getDocs(userQuery);
            
            let userName = "Utente";
            let userPhotoURL = undefined;
            let userRating = 0;
            
            if (!userSnapshot.empty) {
              const userData = userSnapshot.docs[0].data();
              userName = userData.displayName || "Utente";
              userPhotoURL = userData.photoURL;
              userRating = userData.rating || 0;
            }
            
            packages.push({
              id: packageDoc.id,
              from: packageData.from,
              to: packageData.to,
              deadline: packageData.deadline,
              description: packageData.description,
              dimensions: packageData.dimensions,
              price: packageData.price,
              imageUrl: packageData.imageUrl,
              userId: packageData.userId,
              userName,
              userPhotoURL,
              userRating
            });
          }
        }
        
        setCompatiblePackages(packages);
      } catch (error) {
        console.error("Errore durante il recupero dei dati:", error);
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante il caricamento dei pacchi compatibili.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTripAndCompatiblePackages();
  }, [currentUser, navigate, tripId, toast]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-neutral-500">Ricerca pacchi compatibili in corso...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button className="p-2" onClick={() => navigate("/my-shipments?tab=trips")}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-neutral-900"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-neutral-900 ml-2">
            Pacchi compatibili
          </h1>
        </div>

        {trip && (
          <div className="bg-neutral-50 p-4 rounded-lg mb-6">
            <h2 className="text-lg font-medium mb-2">Il tuo viaggio</h2>
            <p className="text-neutral-800 font-medium">{trip.from} → {trip.to}</p>
            <p className="text-sm text-neutral-600">Data: {formatDate(trip.date)}</p>
          </div>
        )}

        {compatiblePackages.length === 0 ? (
          <div className="text-center py-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-neutral-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-neutral-700 font-medium mb-1">Nessun pacco compatibile trovato</p>
            <p className="text-neutral-500 text-sm">Non ci sono pacchi compatibili con questo viaggio al momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {compatiblePackages.map((pkg) => (
              <div key={pkg.id} className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="flex items-start p-4 pb-0">
                  <div className="w-20 h-20 bg-neutral-200 rounded-lg overflow-hidden mr-3 flex-shrink-0">
                    {pkg.imageUrl ? (
                      <img src={pkg.imageUrl} alt="Pacco" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <p className="text-neutral-900 font-medium mb-1">{pkg.from} → {pkg.to}</p>
                    <p className="text-sm text-neutral-500">Entro il {formatDate(pkg.deadline)}</p>
                    <p className="text-sm font-medium text-primary mt-2">{pkg.price} €</p>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-neutral-700 mb-2 text-sm">{pkg.description}</p>
                  {pkg.dimensions && (
                    <p className="text-neutral-500 text-xs mb-3">Dimensioni: {pkg.dimensions}</p>
                  )}
                  
                  <Button
                    onClick={() => handleAcceptPackage(pkg.id)}
                    className="w-full bg-primary text-white"
                    disabled={isSending}
                  >
                    {isSending ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Elaborazione...
                      </div>
                    ) : (
                      "Accetta"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}