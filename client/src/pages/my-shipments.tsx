import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface ShipmentData {
  id: string;
  type: "package" | "trip";
  from: string;
  to: string;
  date: string;
  status: "pending" | "in_progress" | "completed";
  counterpart?: {
    id: string;
    name: string;
    photoURL?: string;
    reviewed?: boolean;
    price?: number;
    rating?: number;
  };
}

export default function MyShipments() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  // Determina quale tab mostrare inizialmente in base ai parametri URL o attività precedenti
  const [activeTab, setActiveTab] = useState<"packages" | "trips">(() => {
    // Controlla se siamo arrivati da un reindirizzamento con parametro specifico
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get("tab");
    return tab === "trips" ? "trips" : "packages";
  });
  const [shipments, setShipments] = useState<ShipmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Funzione per eliminare un viaggio
  const deleteTrip = async (tripId: string) => {
    if (isDeleting) return;
    
    try {
      setIsDeleting(true);
      
      // Verifica se ci sono match associati a questo viaggio
      const matchesQuery = query(
        collection(db, "matches"),
        where("tripId", "==", tripId)
      );
      const matchesSnapshot = await getDocs(matchesQuery);
      
      if (!matchesSnapshot.empty) {
        toast({
          title: "Impossibile eliminare",
          description: "Questo viaggio ha già dei pacchi associati e non può essere eliminato.",
          variant: "destructive"
        });
        return;
      }
      
      // Se non ci sono match, procedi con l'eliminazione
      await deleteDoc(doc(db, "trips", tripId));
      
      // Aggiorna la lista rimuovendo il viaggio eliminato
      setShipments(shipments.filter(s => !(s.type === "trip" && s.id === tripId)));
      
      toast({
        title: "Viaggio eliminato",
        description: "Il viaggio è stato eliminato con successo",
        variant: "default"
      });
    } catch (error) {
      console.error("Errore durante l'eliminazione del viaggio:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione del viaggio",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Funzione per eliminare un pacco
  const deletePackage = async (packageId: string) => {
    if (isDeleting) return;
    
    try {
      setIsDeleting(true);
      
      // Verifica se ci sono match associati a questo pacco
      const matchesQuery = query(
        collection(db, "matches"),
        where("packageId", "==", packageId)
      );
      const matchesSnapshot = await getDocs(matchesQuery);
      
      if (!matchesSnapshot.empty) {
        toast({
          title: "Impossibile eliminare",
          description: "Questo pacco è già stato accettato da un viaggiatore e non può essere eliminato.",
          variant: "destructive"
        });
        return;
      }
      
      // Se non ci sono match, procedi con l'eliminazione
      await deleteDoc(doc(db, "packages", packageId));
      
      // Aggiorna la lista rimuovendo il pacco eliminato
      setShipments(shipments.filter(s => !(s.type === "package" && s.id === packageId)));
      
      toast({
        title: "Pacco eliminato",
        description: "Il pacco è stato eliminato con successo",
        variant: "default"
      });
    } catch (error) {
      console.error("Errore durante l'eliminazione del pacco:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione del pacco",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Effetto per caricare i dati delle spedizioni
  useEffect(() => {
    const fetchShipments = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }
      
      setIsLoading(true);
      const shipmentsData: ShipmentData[] = [];
      
      try {
        // 1. Recupera i pacchi dell'utente
        const packagesQuery = query(
          collection(db, "packages"),
          where("userId", "==", currentUser.uid)
        );
        const packagesSnapshot = await getDocs(packagesQuery);
        
        for (const packageDoc of packagesSnapshot.docs) {
          const packageData = packageDoc.data();
          
          // Verifica se il pacco ha un match
          const matchesQuery = query(
            collection(db, "matches"),
            where("packageId", "==", packageDoc.id)
          );
          const matchesSnapshot = await getDocs(matchesQuery);
          
          let counterpart = undefined;
          
          if (!matchesSnapshot.empty) {
            const matchData = matchesSnapshot.docs[0].data();
            
            // Recupera i dati del viaggiatore
            const travelersQuery = query(
              collection(db, "users"),
              where("uid", "==", matchData.travelerId)
            );
            const travelersSnapshot = await getDocs(travelersQuery);
            
            if (!travelersSnapshot.empty) {
              const travelerData = travelersSnapshot.docs[0].data();
              
              // Verifica se l'utente ha già lasciato una recensione
              const reviewsQuery = query(
                collection(db, "reviews"),
                where("userId", "==", currentUser.uid),
                where("subjectId", "==", matchData.travelerId),
                where("packageId", "==", packageDoc.id)
              );
              const reviewsSnapshot = await getDocs(reviewsQuery);
              
              counterpart = {
                id: matchData.travelerId,
                name: travelerData.displayName || "Viaggiatore",
                photoURL: travelerData.photoURL,
                reviewed: !reviewsSnapshot.empty,
                rating: travelerData.rating || 0
              };
            }
          }
          
          shipmentsData.push({
            id: packageDoc.id,
            type: "package",
            from: packageData.from,
            to: packageData.to,
            date: packageData.deadline,
            status: packageData.status,
            counterpart
          });
        }
        
        // 2. Recupera i viaggi dell'utente
        console.log("Cercando viaggi per l'utente con UID:", currentUser.uid);
        const tripsQuery = query(
          collection(db, "trips"),
          where("userId", "==", currentUser.uid)
        );
        const tripsSnapshot = await getDocs(tripsQuery);
        
        console.log("Numero di viaggi trovati:", tripsSnapshot.docs.length);
        if (tripsSnapshot.docs.length === 0) {
          // Proviamo a recuperare tutti i viaggi e controlliamo manualmente
          const allTripsQuery = query(collection(db, "trips"));
          const allTripsSnapshot = await getDocs(allTripsQuery);
          console.log("Totale viaggi nel database:", allTripsSnapshot.docs.length);
          
          allTripsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log("Viaggio trovato - ID:", doc.id, "UserID:", data.userId);
          });
        }
        
        for (const tripDoc of tripsSnapshot.docs) {
          const tripData = tripDoc.data();
          
          // Verifica se il viaggio ha match
          const matchesQuery = query(
            collection(db, "matches"),
            where("tripId", "==", tripDoc.id)
          );
          const matchesSnapshot = await getDocs(matchesQuery);
          
          let counterparts = [];
          
          for (const matchDoc of matchesSnapshot.docs) {
            const matchData = matchDoc.data();
            
            // Recupera i dati del mittente del pacco
            const packageOwnersQuery = query(
              collection(db, "users"),
              where("uid", "==", matchData.packageOwnerId)
            );
            const packageOwnersSnapshot = await getDocs(packageOwnersQuery);
            
            if (!packageOwnersSnapshot.empty) {
              const packageOwnerData = packageOwnersSnapshot.docs[0].data();
              
              // Recupera i dettagli del pacco
              const packageQuery = query(
                collection(db, "packages"),
                where("id", "==", matchData.packageId)
              );
              const packageSnapshot = await getDocs(packageQuery);
              let packagePrice = 0;
              
              if (!packageSnapshot.empty) {
                const packageData = packageSnapshot.docs[0].data();
                packagePrice = packageData.price || 0;
              }
              
              // Verifica se l'utente ha già lasciato una recensione
              const reviewsQuery = query(
                collection(db, "reviews"),
                where("userId", "==", currentUser.uid),
                where("subjectId", "==", matchData.packageOwnerId),
                where("tripId", "==", tripDoc.id)
              );
              const reviewsSnapshot = await getDocs(reviewsQuery);
              
              counterparts.push({
                id: matchData.packageOwnerId,
                name: packageOwnerData.displayName || "Utente",
                photoURL: packageOwnerData.photoURL,
                reviewed: !reviewsSnapshot.empty,
                price: packagePrice,
                rating: packageOwnerData.rating || 0
              });
            }
          }
          
          if (counterparts.length > 0) {
            // Se ci sono più match, crea una voce per ciascuno
            for (const counterpart of counterparts) {
              shipmentsData.push({
                id: tripDoc.id,
                type: "trip",
                from: tripData.from,
                to: tripData.to,
                date: tripData.date,
                status: tripData.status,
                counterpart
              });
            }
          } else {
            // Se non ci sono match, crea una voce senza controparte
            shipmentsData.push({
              id: tripDoc.id,
              type: "trip",
              from: tripData.from,
              to: tripData.to,
              date: tripData.date,
              status: tripData.status
            });
          }
        }
        
        // Ordina le spedizioni per data (più recenti prima)
        shipmentsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setShipments(shipmentsData);
      } catch (error) {
        console.error("Errore durante il recupero delle spedizioni:", error);
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante il caricamento delle tue attività",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchShipments();
  }, [currentUser, navigate, toast]);
  
  // Filtra le spedizioni in base al tipo e allo stato
  const myPackages = shipments.filter(s => s.type === "package");
  const myTrips = shipments.filter(s => s.type === "trip");
  
  console.log("Tutti i viaggi dopo il filtraggio:", myTrips);
  console.log("Status dei viaggi:", myTrips.map(trip => ({id: trip.id, status: trip.status})));
  
  // Raggruppa per stato
  const pendingShipments = shipments.filter(s => 
    s.status === "pending" || 
    s.status === "active"
  );
  console.log("Viaggi in attesa/attivi:", pendingShipments.filter(s => s.type === "trip"));
  
  const inProgressShipments = shipments.filter(s => s.status === "in_progress");
  const completedShipments = shipments.filter(s => s.status === "completed");
  
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
  
  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Le mie attività</h1>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "packages" | "trips")}>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="packages" className="flex-1">
              I miei pacchi
              {myPackages.length > 0 && (
                <span className="ml-2 bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded-full text-xs">
                  {myPackages.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="trips" className="flex-1">
              I miei viaggi
              {myTrips.length > 0 && (
                <span className="ml-2 bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded-full text-xs">
                  {myTrips.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="packages">
            {isLoading ? (
              <div className="flex justify-center items-center min-h-[300px]">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-neutral-500">Caricamento in corso...</p>
                </div>
              </div>
            ) : myPackages.length === 0 ? (
              <div className="text-center py-10">
                <div className="bg-neutral-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-neutral-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">Nessun pacco</h3>
                <p className="text-neutral-500 max-w-xs mx-auto mb-6">
                  Non hai ancora creato nessuna richiesta di spedizione. Inizia a inviare i tuoi pacchi!
                </p>
                <Button onClick={() => navigate("/send-package")} className="bg-primary text-white">
                  Invia un pacco
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingShipments.filter(s => s.type === "package").length > 0 && (
                  <div>
                    <h2 className="text-lg font-medium mb-3">In attesa di un viaggiatore</h2>
                    <div className="grid grid-cols-1 gap-4">
                      {pendingShipments.filter(s => s.type === "package").map((shipment) => (
                        <div
                          key={`package-${shipment.id}`}
                          className="bg-white rounded-lg border border-neutral-200 p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{shipment.from} → {shipment.to}</p>
                              <p className="text-sm text-neutral-500">Entro il {formatDate(shipment.date)}</p>
                            </div>
                            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs">
                              In attesa
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-4">
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => navigate(`/package-details/${shipment.id}`)}
                                variant="outline"
                                className="text-sm h-9"
                              >
                                Vedi dettagli
                              </Button>
                              <Button
                                onClick={() => navigate(`/edit-package/${shipment.id}`)}
                                variant="outline"
                                className="text-sm h-9"
                              >
                                Modifica
                              </Button>
                            </div>
                            <Button
                              onClick={() => deletePackage(shipment.id)}
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 text-sm h-9"
                              disabled={isDeleting}
                            >
                              Elimina
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {inProgressShipments.filter(s => s.type === "package").length > 0 && (
                  <div>
                    <h2 className="text-lg font-medium mb-3">In consegna</h2>
                    <div className="grid grid-cols-1 gap-4">
                      {inProgressShipments.filter(s => s.type === "package").map((shipment) => (
                        <div
                          key={`package-${shipment.id}`}
                          className="bg-white rounded-lg border border-neutral-200 p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{shipment.from} → {shipment.to}</p>
                              <p className="text-sm text-neutral-500">Entro il {formatDate(shipment.date)}</p>
                            </div>
                            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs">
                              In consegna
                            </div>
                          </div>
                          
                          {shipment.counterpart && (
                            <div className="flex items-center mt-4 p-3 bg-neutral-50 rounded-lg">
                              <Avatar className="h-10 w-10 mr-3">
                                {shipment.counterpart.photoURL ? (
                                  <AvatarImage src={shipment.counterpart.photoURL} />
                                ) : (
                                  <AvatarFallback>
                                    {shipment.counterpart.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <p className="font-medium">{shipment.counterpart.name}</p>
                                <div className="flex items-center">
                                  <Rating value={shipment.counterpart.rating || 0} readOnly />
                                  <span className="text-xs text-neutral-500 ml-1">
                                    {shipment.counterpart.rating?.toFixed(1) || "N/A"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center mt-4">
                            <Button
                              onClick={() => navigate(`/package-details/${shipment.id}`)}
                              variant="outline"
                              className="text-sm h-9"
                            >
                              Vedi dettagli
                            </Button>
                            
                            {shipment.counterpart && (
                              <Button
                                onClick={() => {
                                  // Trova la chat room tra l'utente e il viaggiatore
                                  navigate(`/chat/${shipment.counterpart?.id}`);
                                }}
                                className="bg-primary text-white text-sm h-9"
                              >
                                Chatta
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {completedShipments.filter(s => s.type === "package").length > 0 && (
                  <div>
                    <h2 className="text-lg font-medium mb-3">Completati</h2>
                    <div className="grid grid-cols-1 gap-4">
                      {completedShipments.filter(s => s.type === "package").map((shipment) => (
                        <div
                          key={`package-${shipment.id}`}
                          className="bg-white rounded-lg border border-neutral-200 p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{shipment.from} → {shipment.to}</p>
                              <p className="text-sm text-neutral-500">Consegnato il {formatDate(shipment.date)}</p>
                            </div>
                            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs">
                              Completato
                            </div>
                          </div>
                          
                          {shipment.counterpart && (
                            <div className="flex items-center mt-4 p-3 bg-neutral-50 rounded-lg">
                              <Avatar className="h-10 w-10 mr-3">
                                {shipment.counterpart.photoURL ? (
                                  <AvatarImage src={shipment.counterpart.photoURL} />
                                ) : (
                                  <AvatarFallback>
                                    {shipment.counterpart.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <p className="font-medium">{shipment.counterpart.name}</p>
                                <div className="flex items-center">
                                  <Rating value={shipment.counterpart.rating || 0} readOnly />
                                  <span className="text-xs text-neutral-500 ml-1">
                                    {shipment.counterpart.rating?.toFixed(1) || "N/A"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center mt-4">
                            <Button
                              onClick={() => navigate(`/package-details/${shipment.id}`)}
                              variant="outline"
                              className="text-sm h-9"
                            >
                              Vedi dettagli
                            </Button>
                            
                            {shipment.counterpart && !shipment.counterpart.reviewed && (
                              <Button
                                onClick={() => navigate(`/review/${shipment.id}?type=package`)}
                                className="bg-primary text-white text-sm h-9"
                              >
                                Lascia recensione
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="trips">
            {isLoading ? (
              <div className="flex justify-center items-center min-h-[300px]">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-neutral-500">Caricamento in corso...</p>
                </div>
              </div>
            ) : myTrips.length === 0 ? (
              <div className="text-center py-10">
                <div className="bg-neutral-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-neutral-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">Nessun viaggio</h3>
                <p className="text-neutral-500 max-w-xs mx-auto mb-6">
                  Non hai ancora segnalato nessun viaggio. Inizia ad accettare pacchi!
                </p>
                <Button onClick={() => navigate("/report-trip")} className="bg-primary text-white">
                  Segnala un viaggio
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingShipments.filter(s => s.type === "trip").length > 0 && (
                  <div>
                    <h2 className="text-lg font-medium mb-3">Viaggi attivi</h2>
                    <div className="grid grid-cols-1 gap-4">
                      {pendingShipments.filter(s => s.type === "trip").map((shipment) => (
                        <div
                          key={`trip-${shipment.id}-${shipment.counterpart?.id || 'solo'}`}
                          className="bg-white rounded-lg border border-neutral-200 p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{shipment.from} → {shipment.to}</p>
                              <p className="text-sm text-neutral-500">Data: {formatDate(shipment.date)}</p>
                            </div>
                            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs">
                              In attesa
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-4">
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => navigate(`/trip-details/${shipment.id}`)}
                                variant="outline"
                                className="text-sm h-9"
                              >
                                Vedi dettagli
                              </Button>
                              
                              <Button
                                onClick={() => navigate(`/compatible-packages/${shipment.id}`)}
                                className="bg-primary text-white text-sm h-9"
                              >
                                Trova pacchi
                              </Button>
                            </div>
                            
                            <Button
                              onClick={() => deleteTrip(shipment.id)}
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 text-sm h-9"
                              disabled={isDeleting}
                            >
                              Elimina
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {inProgressShipments.filter(s => s.type === "trip").length > 0 && (
                  <div>
                    <h2 className="text-lg font-medium mb-3">Consegne in corso</h2>
                    <div className="grid grid-cols-1 gap-4">
                      {inProgressShipments.filter(s => s.type === "trip").map((shipment) => (
                        <div
                          key={`trip-${shipment.id}-${shipment.counterpart?.id || 'solo'}`}
                          className="bg-white rounded-lg border border-neutral-200 p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{shipment.from} → {shipment.to}</p>
                              <p className="text-sm text-neutral-500">Data: {formatDate(shipment.date)}</p>
                            </div>
                            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs">
                              In corso
                            </div>
                          </div>
                          
                          {shipment.counterpart && (
                            <div className="flex items-center justify-between mt-4 p-3 bg-neutral-50 rounded-lg">
                              <div className="flex items-center">
                                <Avatar className="h-10 w-10 mr-3">
                                  {shipment.counterpart.photoURL ? (
                                    <AvatarImage src={shipment.counterpart.photoURL} />
                                  ) : (
                                    <AvatarFallback>
                                      {shipment.counterpart.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div>
                                  <p className="font-medium">{shipment.counterpart.name}</p>
                                  <div className="flex items-center">
                                    <Rating value={shipment.counterpart.rating || 0} readOnly />
                                    <span className="text-xs text-neutral-500 ml-1">
                                      {shipment.counterpart.rating?.toFixed(1) || "N/A"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-primary mb-1">
                                  {shipment.counterpart.price ? `${shipment.counterpart.price} €` : ""}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center mt-4">
                            <Button
                              onClick={() => navigate(`/trip-details/${shipment.id}`)}
                              variant="outline"
                              className="text-sm h-9"
                            >
                              Vedi dettagli
                            </Button>
                            
                            {shipment.counterpart && (
                              <Button
                                onClick={() => {
                                  // Trova la chat room tra l'utente e il mittente
                                  navigate(`/chat/${shipment.counterpart?.id}`);
                                }}
                                className="bg-primary text-white text-sm h-9"
                              >
                                Chatta
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {completedShipments.filter(s => s.type === "trip").length > 0 && (
                  <div>
                    <h2 className="text-lg font-medium mb-3">Viaggi completati</h2>
                    <div className="grid grid-cols-1 gap-4">
                      {completedShipments.filter(s => s.type === "trip").map((shipment) => (
                        <div
                          key={`trip-${shipment.id}-${shipment.counterpart?.id || 'solo'}`}
                          className="bg-white rounded-lg border border-neutral-200 p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{shipment.from} → {shipment.to}</p>
                              <p className="text-sm text-neutral-500">Completato: {formatDate(shipment.date)}</p>
                            </div>
                            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs">
                              Completato
                            </div>
                          </div>
                          
                          {shipment.counterpart && (
                            <div className="flex items-center justify-between mt-4 p-3 bg-neutral-50 rounded-lg">
                              <div className="flex items-center">
                                <Avatar className="h-10 w-10 mr-3">
                                  {shipment.counterpart.photoURL ? (
                                    <AvatarImage src={shipment.counterpart.photoURL} />
                                  ) : (
                                    <AvatarFallback>
                                      {shipment.counterpart.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div>
                                  <p className="font-medium">{shipment.counterpart.name}</p>
                                  <div className="flex items-center">
                                    <Rating value={shipment.counterpart.rating || 0} readOnly />
                                    <span className="text-xs text-neutral-500 ml-1">
                                      {shipment.counterpart.rating?.toFixed(1) || "N/A"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-primary mb-1">
                                  {shipment.counterpart.price ? `${shipment.counterpart.price} €` : ""}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center mt-4">
                            <Button
                              onClick={() => navigate(`/trip-details/${shipment.id}`)}
                              variant="outline"
                              className="text-sm h-9"
                            >
                              Vedi dettagli
                            </Button>
                            
                            {shipment.counterpart && !shipment.counterpart.reviewed && (
                              <Button
                                onClick={() => navigate(`/review/${shipment.id}?type=trip&userId=${shipment.counterpart?.id}`)}
                                className="bg-primary text-white text-sm h-9"
                              >
                                Lascia recensione
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}