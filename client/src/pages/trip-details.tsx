import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export default function TripDetails() {
  const [, navigate] = useLocation();
  const params = useParams();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [tripData, setTripData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    const fetchTripData = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }
      
      const tripId = params.id;
      if (!tripId) {
        toast({
          title: "Errore",
          description: "ID del viaggio non valido",
          variant: "destructive"
        });
        navigate("/my-shipments");
        return;
      }
      
      setIsLoading(true);
      try {
        const tripRef = doc(db, "trips", tripId);
        const tripSnap = await getDoc(tripRef);
        
        if (!tripSnap.exists()) {
          toast({
            title: "Errore",
            description: "Viaggio non trovato",
            variant: "destructive"
          });
          navigate("/my-shipments");
          return;
        }
        
        // Verifica che questo viaggio appartenga all'utente corrente
        const tripData = tripSnap.data();
        if (tripData.userId !== currentUser.uid) {
          toast({
            title: "Accesso negato",
            description: "Non hai il permesso di accedere a questo viaggio",
            variant: "destructive"
          });
          navigate("/my-shipments");
          return;
        }
        
        setTripData({ id: tripId, ...tripData });
      } catch (error) {
        console.error("Errore durante il recupero dei dati del viaggio:", error);
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante il recupero dei dati del viaggio",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTripData();
  }, [currentUser, navigate, params.id, toast]);
  
  const handleDelete = async () => {
    if (window.confirm("Sei sicuro di voler eliminare questo viaggio?")) {
      setIsDeleting(true);
      try {
        const tripId = params.id;
        
        // Verifica se ci sono dei match associati al viaggio
        const matchesQuery = query(
          collection(db, "matches"),
          where("tripId", "==", tripId)
        );
        const matchesSnapshot = await getDocs(matchesQuery);
        
        // Elimina tutti i match associati
        const deleteMatchPromises = matchesSnapshot.docs.map(matchDoc => 
          deleteDoc(doc(db, "matches", matchDoc.id))
        );
        await Promise.all(deleteMatchPromises);
        
        // Elimina il viaggio
        await deleteDoc(doc(db, "trips", tripId));
        
        toast({
          title: "Viaggio eliminato",
          description: "Il viaggio è stato eliminato con successo",
          variant: "default"
        });
        
        navigate("/my-shipments?tab=trips");
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
    }
  };
  
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
        <div className="p-6 flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-neutral-500">Caricamento dettagli in corso...</p>
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
          <h1 className="text-2xl font-bold text-neutral-900 ml-2">Dettagli Viaggio</h1>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          {tripData && (
            <>
              <div className="mb-6 border-b border-neutral-200 pb-4">
                <h2 className="text-xl font-semibold text-neutral-900 mb-1">Informazioni sul Viaggio</h2>
                <p className="text-neutral-500">Dettagli del tuo itinerario</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Da</p>
                  <p className="font-medium text-neutral-900">{tripData.from}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 mb-1">A</p>
                  <p className="font-medium text-neutral-900">{tripData.to}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Data di viaggio</p>
                  <p className="font-medium text-neutral-900">{formatDate(tripData.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Capacità</p>
                  <p className="font-medium text-neutral-900">{tripData.capacity} {tripData.capacity === 1 ? 'pacco' : 'pacchi'}</p>
                </div>
                {tripData.notes && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-neutral-500 mb-1">Note</p>
                    <p className="text-neutral-900">{tripData.notes}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Stato</p>
                  <div className="inline-block">
                    {tripData.status === "active" && (
                      <div className="bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full text-sm font-medium">In attesa</div>
                    )}
                    {tripData.status === "in_progress" && (
                      <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">In corso</div>
                    )}
                    {tripData.status === "completed" && (
                      <div className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-sm font-medium">Completato</div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button
                  onClick={() => navigate(`/edit-trip/${tripData.id}`)}
                  className="bg-primary text-white px-6 py-3 rounded-lg h-auto font-medium"
                >
                  Modifica viaggio
                </Button>
                <Button
                  onClick={handleDelete}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg h-auto font-medium"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Eliminazione in corso..." : "Elimina viaggio"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}