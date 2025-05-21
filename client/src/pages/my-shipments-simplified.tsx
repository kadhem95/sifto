import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export default function MyShipmentsSimplified() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"packages" | "trips">(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get("tab");
    return tab === "trips" ? "trips" : "packages";
  });
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [myPackages, setMyPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      setIsLoading(true);
      
      try {
        // Recupera i viaggi dell'utente - versione semplificata
        const tripsQuery = query(
          collection(db, "trips"),
          where("userId", "==", currentUser.uid)
        );
        
        const tripsSnapshot = await getDocs(tripsQuery);
        const tripsData = tripsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: "trip"
        }));
        
        console.log("Viaggi recuperati:", tripsData.length);
        setMyTrips(tripsData);
        
        // Recupera i pacchi dell'utente - versione semplificata
        const packagesQuery = query(
          collection(db, "packages"),
          where("userId", "==", currentUser.uid)
        );
        
        const packagesSnapshot = await getDocs(packagesQuery);
        const packagesData = packagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: "package"
        }));
        
        console.log("Pacchi recuperati:", packagesData.length);
        setMyPackages(packagesData);
      } catch (error) {
        console.error("Errore durante il recupero dei dati:", error);
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante il caricamento delle tue attività",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser, navigate, toast]);
  
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
              <div className="space-y-4">
                {myPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="bg-white rounded-lg border border-neutral-200 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{pkg.from} → {pkg.to}</p>
                        <p className="text-sm text-neutral-500">
                          {pkg.deadline ? `Entro il ${formatDate(pkg.deadline)}` : "Data non specificata"}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs ${
                        pkg.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        pkg.status === 'in_progress' ? 'bg-primary/10 text-primary' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {pkg.status === 'pending' ? 'In attesa' : 
                         pkg.status === 'in_progress' ? 'In consegna' : 
                         'Completato'}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4">
                      <Button
                        onClick={() => navigate(`/package-details/${pkg.id}`)}
                        variant="outline"
                        className="text-sm h-9"
                      >
                        Vedi dettagli
                      </Button>
                      
                      {pkg.status === 'pending' && (
                        <Button
                          onClick={() => navigate(`/edit-package/${pkg.id}`)}
                          variant="outline"
                          className="text-sm h-9"
                        >
                          Modifica
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
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
              <div className="space-y-4">
                {myTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="bg-white rounded-lg border border-neutral-200 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{trip.from} → {trip.to}</p>
                        <p className="text-sm text-neutral-500">
                          {trip.date ? `Data: ${formatDate(trip.date)}` : "Data non specificata"}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs ${
                        trip.status === 'pending' || trip.status === 'active' ? 'bg-yellow-100 text-yellow-800' : 
                        trip.status === 'in_progress' ? 'bg-primary/10 text-primary' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {trip.status === 'pending' || trip.status === 'active' ? 'In attesa' : 
                         trip.status === 'in_progress' ? 'In corso' : 
                         'Completato'}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-4">
                      <Button
                        onClick={() => navigate(`/trip-details/${trip.id}`)}
                        variant="outline"
                        className="text-sm h-9"
                      >
                        Vedi dettagli
                      </Button>
                      
                      {(trip.status === 'pending' || trip.status === 'active') && (
                        <Button
                          onClick={() => navigate(`/compatible-packages/${trip.id}`)}
                          className="bg-primary text-white text-sm h-9"
                        >
                          Trova pacchi
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}