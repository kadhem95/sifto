import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { LocationInput } from "@/components/ui/location-input";
import { DatePicker } from "@/components/ui/date-picker";

// Schema del viaggio
const tripFormSchema = z.object({
  from: z.string().min(2, "È richiesta la località di partenza"),
  to: z.string().min(2, "È richiesta la località di destinazione"),
  date: z.string().min(1, "È richiesta la data di viaggio"),
  capacity: z.coerce.number().min(1, "La capacità deve essere almeno 1"),
  notes: z.string().optional(),
});

type TripFormValues = z.infer<typeof tripFormSchema>;

export default function EditTrip() {
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
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      from: "",
      to: "",
      date: "",
      capacity: 1,
      notes: "",
    }
  });
  
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
      
      setInitialLoading(true);
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
            description: "Non hai il permesso di modificare questo viaggio",
            variant: "destructive"
          });
          navigate("/my-shipments");
          return;
        }
        
        // Popola il form con i dati del viaggio
        reset({
          from: tripData.from,
          to: tripData.to,
          date: tripData.date,
          capacity: tripData.capacity,
          notes: tripData.notes || "",
        });
      } catch (error) {
        console.error("Errore durante il recupero dei dati del viaggio:", error);
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante il recupero dei dati del viaggio",
          variant: "destructive"
        });
      } finally {
        setInitialLoading(false);
      }
    };
    
    fetchTripData();
  }, [currentUser, navigate, params.id, toast, reset]);
  
  const onSubmit = async (data: TripFormValues) => {
    setIsLoading(true);
    
    try {
      const tripId = params.id;
      const tripRef = doc(db, "trips", tripId);
      
      // Aggiorna il viaggio
      await updateDoc(tripRef, {
        from: data.from,
        to: data.to,
        date: data.date,
        capacity: data.capacity,
        notes: data.notes || "",
        updatedAt: new Date().toISOString(),
      });
      
      toast({
        title: "Viaggio aggiornato",
        description: "Il viaggio è stato aggiornato con successo",
        variant: "default"
      });
      
      // Torna alla pagina dei dettagli
      navigate(`/trip-details/${tripId}`);
    } catch (error) {
      console.error("Errore durante l'aggiornamento del viaggio:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento del viaggio",
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
          <button className="p-2" onClick={() => navigate(`/trip-details/${params.id}`)}>
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
          <h1 className="text-2xl font-bold text-neutral-900 ml-2">Modifica Viaggio</h1>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Campo Partenza */}
            <div className="mb-4">
              <LocationInput
                id="from-location"
                label="Località di partenza"
                value={watch("from")}
                onChange={(value) => setValue("from", value, { shouldValidate: true })}
                error={errors.from?.message}
              />
            </div>

            {/* Campo Destinazione */}
            <div className="mb-4">
              <LocationInput
                id="to-location"
                label="Località di destinazione"
                value={watch("to")}
                onChange={(value) => setValue("to", value, { shouldValidate: true })}
                error={errors.to?.message}
              />
            </div>

            {/* Data di viaggio con selettore moderno */}
            <DatePicker
              label="Data di viaggio"
              value={watch("date")}
              onChange={(value) => setValue("date", value, { shouldValidate: true })}
              error={errors.date?.message}
            />

            {/* Campo Capacità */}
            <div className="mb-6">
              <Label htmlFor="capacity" className="block text-neutral-700 font-medium mb-2">Capacità di trasporto</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
                placeholder="Numero di pacchi che puoi trasportare"
                {...register("capacity")}
              />
              {errors.capacity && (
                <p className="text-red-500 text-sm mt-1">{errors.capacity.message}</p>
              )}
            </div>

            {/* Campo Note */}
            <div className="mb-6">
              <Label htmlFor="notes" className="block text-neutral-700 font-medium mb-2">Note (opzionale)</Label>
              <Input
                id="notes"
                className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
                placeholder="Aggiungi eventuali note per il tuo viaggio"
                {...register("notes")}
              />
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