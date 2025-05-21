import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { createTrip } from "@/lib/firebase";
import { LocationInput } from "@/components/ui/location-input";

// Schema del viaggio
const tripFormSchema = z.object({
  from: z.string().min(2, "È richiesta la località di partenza"),
  to: z.string().min(2, "È richiesta la località di destinazione"),
  date: z.string().min(1, "È richiesta la data di viaggio"),
  capacity: z.coerce.number().min(1, "È richiesta la capacità di trasporto"),
});

type TripFormValues = z.infer<typeof tripFormSchema>;

export default function ReportTrip() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      from: "",
      to: "",
      date: "",
      capacity: 1,
    },
  });

  const onSubmit = async (data: TripFormValues) => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    setIsLoading(true);

    try {
      // Create the trip document
      await createTrip({
        userId: currentUser.uid,
        from: data.from,
        to: data.to,
        date: data.date,
        capacity: data.capacity,
        status: "active",
        transportType: "unspecified", // Valore predefinito
        notes: "", // Valore predefinito
        createdAt: new Date().toISOString(),
      });

      // Navigate to the packages list screen
      navigate("/packages");
    } catch (error) {
      console.error("Error creating trip:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button className="p-2" onClick={() => navigate("/")}>
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
            Aggiungi un viaggio
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Campo Da con autocompletamento */}
          <div className="mb-4">
            <LocationInput
              id="from"
              label="Da"
              placeholder="Seleziona la città di partenza"
              value={watch("from")}
              onChange={(value) => setValue("from", value, { shouldValidate: true })}
              error={errors.from?.message}
            />
          </div>

          {/* Campo A con autocompletamento */}
          <div className="mb-4">
            <LocationInput
              id="to"
              label="A"
              placeholder="Seleziona la città di destinazione"
              value={watch("to")}
              onChange={(value) => setValue("to", value, { shouldValidate: true })}
              error={errors.to?.message}
            />
          </div>

          {/* Campo Data */}
          <div className="mb-4">
            <Label htmlFor="date" className="block text-neutral-700 font-medium mb-2">Data di viaggio</Label>
            <Input
              id="date"
              type="date"
              className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
              {...register("date")}
            />
            {errors.date && (
              <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
            )}
          </div>

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

          {/* Pulsante di invio */}
          <Button
            type="submit"
            className="w-full bg-[#3DD598] hover:bg-[#5ae0ad] text-white font-medium rounded-lg py-4 mb-4 h-auto transition-all duration-200 active:scale-[0.98] active:opacity-90"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Elaborazione...
              </div>
            ) : (
              "Trova Pacchi"
            )}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}