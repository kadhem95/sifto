import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export default function PackageDetails() {
  const [, navigate] = useLocation();
  const params = useParams();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [packageData, setPackageData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    const fetchPackageData = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }
      
      const packageId = params.id;
      if (!packageId) {
        toast({
          title: "Errore",
          description: "ID del pacco non valido",
          variant: "destructive"
        });
        navigate("/my-shipments");
        return;
      }
      
      setIsLoading(true);
      try {
        const packageRef = doc(db, "packages", packageId);
        const packageSnap = await getDoc(packageRef);
        
        if (!packageSnap.exists()) {
          toast({
            title: "Errore",
            description: "Pacco non trovato",
            variant: "destructive"
          });
          navigate("/my-shipments");
          return;
        }
        
        // Verifica che questo pacco appartenga all'utente corrente
        const packageData = packageSnap.data();
        if (packageData.userId !== currentUser.uid) {
          toast({
            title: "Accesso negato",
            description: "Non hai il permesso di accedere a questo pacco",
            variant: "destructive"
          });
          navigate("/my-shipments");
          return;
        }
        
        setPackageData({ id: packageId, ...packageData });
      } catch (error) {
        console.error("Errore durante il recupero dei dati del pacco:", error);
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante il recupero dei dati del pacco",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPackageData();
  }, [currentUser, navigate, params.id, toast]);
  
  const handleDelete = async () => {
    if (window.confirm("Sei sicuro di voler eliminare questo pacco?")) {
      setIsDeleting(true);
      try {
        const packageId = params.id;
        
        // Verifica se ci sono dei match associati al pacco
        const matchesQuery = query(
          collection(db, "matches"),
          where("packageId", "==", packageId)
        );
        const matchesSnapshot = await getDocs(matchesQuery);
        
        // Elimina tutti i match associati
        const deleteMatchPromises = matchesSnapshot.docs.map(matchDoc => 
          fetch(`/api/matches/${matchDoc.id}`, { method: "DELETE" })
        );
        await Promise.all(deleteMatchPromises);
        
        // Elimina il pacco
        await fetch(`/api/packages/${packageId}`, { method: "DELETE" });
        
        toast({
          title: "Pacco eliminato",
          description: "Il pacco è stato eliminato con successo",
          variant: "default"
        });
        
        navigate("/my-shipments?tab=packages");
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
          <button className="p-2" onClick={() => navigate("/my-shipments?tab=packages")}>
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
          <h1 className="text-2xl font-bold text-neutral-900 ml-2">Dettagli Pacco</h1>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          {packageData && (
            <>
              <div className="mb-6 border-b border-neutral-200 pb-4">
                <h2 className="text-xl font-semibold text-neutral-900 mb-1">Informazioni sul Pacco</h2>
                <p className="text-neutral-500">Dettagli della spedizione</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Da</p>
                  <p className="font-medium text-neutral-900">{packageData.from}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 mb-1">A</p>
                  <p className="font-medium text-neutral-900">{packageData.to}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Entro il</p>
                  <p className="font-medium text-neutral-900">{formatDate(packageData.deadline)}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Prezzo offerto</p>
                  <p className="font-medium text-neutral-900">{packageData.price}€</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-neutral-500 mb-1">Descrizione</p>
                  <p className="text-neutral-900">{packageData.description}</p>
                </div>
                {packageData.dimensions && (
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Dimensioni</p>
                    <p className="font-medium text-neutral-900">{packageData.dimensions}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Stato</p>
                  <div className="inline-block">
                    {packageData.status === "pending" && (
                      <div className="bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full text-sm font-medium">In attesa</div>
                    )}
                    {packageData.status === "accepted" && (
                      <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">Accettato</div>
                    )}
                    {packageData.status === "in_progress" && (
                      <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">In corso</div>
                    )}
                    {packageData.status === "completed" && (
                      <div className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-sm font-medium">Completato</div>
                    )}
                  </div>
                </div>
              </div>
              
              {packageData.imageUrl && (
                <div className="mb-6">
                  <p className="text-sm text-neutral-500 mb-2">Immagine del pacco</p>
                  <div className="rounded-lg overflow-hidden max-w-md">
                    <img src={packageData.imageUrl} alt="Immagine del pacco" className="w-full h-auto" />
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button
                  onClick={() => navigate(`/edit-package/${packageData.id}`)}
                  className="bg-primary text-white px-6 py-3 rounded-lg h-auto font-medium"
                >
                  Modifica pacco
                </Button>
                <Button
                  onClick={handleDelete}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg h-auto font-medium"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Eliminazione in corso..." : "Elimina pacco"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}