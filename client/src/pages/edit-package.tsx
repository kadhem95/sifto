import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { LocationInput } from "@/components/ui/location-input";
import { DatePicker } from "@/components/ui/date-picker";

// Schema del pacco
const packageFormSchema = z.object({
  from: z.string().min(2, "È richiesta la località di partenza"),
  to: z.string().min(2, "È richiesta la località di destinazione"),
  deadline: z.string().min(1, "È richiesta la data di consegna"),
  description: z.string().min(5, "La descrizione deve essere di almeno 5 caratteri"),
  dimensions: z.string().optional(),
  price: z.coerce.number().min(1, "Il prezzo deve essere maggiore di 0"),
});

type PackageFormValues = z.infer<typeof packageFormSchema>;

export default function EditPackage() {
  const [, navigate] = useLocation();
  const params = useParams();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      from: "",
      to: "",
      deadline: "",
      description: "",
      dimensions: "",
      price: 0,
    }
  });
  
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
      
      setInitialLoading(true);
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
            description: "Non hai il permesso di modificare questo pacco",
            variant: "destructive"
          });
          navigate("/my-shipments");
          return;
        }
        
        // Popola il form con i dati del pacco
        reset({
          from: packageData.from,
          to: packageData.to,
          deadline: packageData.deadline,
          description: packageData.description,
          dimensions: packageData.dimensions || "",
          price: packageData.price,
        });
      } catch (error) {
        console.error("Errore durante il recupero dei dati del pacco:", error);
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante il recupero dei dati del pacco",
          variant: "destructive"
        });
      } finally {
        setInitialLoading(false);
      }
    };
    
    fetchPackageData();
  }, [currentUser, navigate, params.id, toast, reset]);
  
  const onSubmit = async (data: PackageFormValues) => {
    setIsLoading(true);
    
    try {
      const packageId = params.id;
      const packageRef = doc(db, "packages", packageId);
      
      // Aggiorna il pacco
      await updateDoc(packageRef, {
        from: data.from,
        to: data.to,
        deadline: data.deadline,
        description: data.description,
        dimensions: data.dimensions || "",
        price: data.price,
        updatedAt: new Date().toISOString(),
      });
      
      toast({
        title: "Pacco aggiornato",
        description: "Il pacco è stato aggiornato con successo",
        variant: "default"
      });
      
      // Torna alla pagina dei dettagli
      navigate(`/package-details/${packageId}`);
    } catch (error) {
      console.error("Errore durante l'aggiornamento del pacco:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento del pacco",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (initialLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-neutral-500">Caricamento dati in corso...</p>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button className="p-2" onClick={() => navigate(`/package-details/${params.id}`)}>
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
          <h1 className="text-2xl font-bold text-neutral-900 ml-2">Modifica Pacco</h1>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Campo Partenza */}
            <div className="mb-4">
              <LocationInput
                label="Località di partenza"
                value={watch("from")}
                onChange={(value) => setValue("from", value, { shouldValidate: true })}
                error={errors.from?.message}
              />
            </div>

            {/* Campo Destinazione */}
            <div className="mb-4">
              <LocationInput
                label="Località di destinazione"
                value={watch("to")}
                onChange={(value) => setValue("to", value, { shouldValidate: true })}
                error={errors.to?.message}
              />
            </div>

            {/* Data di consegna con selettore moderno */}
            <DatePicker
              label="Data entro cui consegnare"
              value={watch("deadline")}
              onChange={(value) => setValue("deadline", value, { shouldValidate: true })}
              error={errors.deadline?.message}
            />

            {/* Campo Descrizione */}
            <div className="mb-4">
              <Label htmlFor="description" className="block text-neutral-700 font-medium mb-2">Descrizione del pacco</Label>
              <Textarea
                id="description"
                className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-24"
                placeholder="Descrivi il tuo pacco, cosa contiene, eventuali precauzioni..."
                {...register("description")}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>

            {/* Campo Dimensioni */}
            <div className="mb-4">
              <Label htmlFor="dimensions" className="block text-neutral-700 font-medium mb-2">Dimensioni (opzionale)</Label>
              <Input
                id="dimensions"
                className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
                placeholder="Es: 30x20x15 cm, piccolo, medio, grande..."
                {...register("dimensions")}
              />
            </div>

            {/* Campo Prezzo */}
            <div className="mb-6">
              <Label htmlFor="price" className="block text-neutral-700 font-medium mb-2">Prezzo offerto (€)</Label>
              <Input
                id="price"
                type="number"
                min="1"
                step="0.01"
                className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
                placeholder="Quanto sei disposto a pagare"
                {...register("price")}
              />
              {errors.price && (
                <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-white font-medium rounded-lg py-4 mb-4 h-auto"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Aggiornamento in corso...
                </div>
              ) : (
                "Salva modifiche"
              )}
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}