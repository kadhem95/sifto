import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { createTrip } from "@/lib/firebase";

const tripFormSchema = z.object({
  from: z.string().min(2, "È richiesta la località di partenza"),
  to: z.string().min(2, "È richiesta la località di destinazione"),
  date: z.string().min(1, "È richiesta la data di viaggio"),
  transportType: z.string().min(1, "È richiesto il tipo di mezzo"),
  notes: z.string().optional(),
});

type TripFormValues = z.infer<typeof tripFormSchema>;

export default function ReportTrip() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTransportType, setSelectedTransportType] = useState<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      from: "",
      to: "",
      date: "",
      transportType: "",
      notes: "",
    },
  });

  const handleTransportTypeSelect = (type: string) => {
    setSelectedTransportType(type);
    setValue("transportType", type);
  };

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
        transportType: data.transportType,
        notes: data.notes,
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
            Segnala un Viaggio
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <Label htmlFor="from" className="block text-neutral-700 font-medium mb-2">Da</Label>
            <div className="relative">
              <Input
                id="from"
                className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
                placeholder="es. Roma"
                {...register("from")}
              />
              <button type="button" className="absolute right-3 top-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-neutral-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            {errors.from && (
              <p className="text-red-500 text-sm mt-1">{errors.from.message}</p>
            )}
          </div>

          <div className="mb-4">
            <Label htmlFor="to" className="block text-neutral-700 font-medium mb-2">A</Label>
            <Input
              id="to"
              className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
              placeholder="es. Sfax"
              {...register("to")}
            />
            {errors.to && (
              <p className="text-red-500 text-sm mt-1">{errors.to.message}</p>
            )}
          </div>

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

          <div className="mb-4">
            <Label className="block text-neutral-700 font-medium mb-2">Tipo di mezzo</Label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <button
                type="button"
                onClick={() => handleTransportTypeSelect("auto_piccola")}
                className={`${
                  selectedTransportType === "auto_piccola"
                    ? "bg-secondary text-white"
                    : "bg-neutral-100 text-neutral-700"
                } font-medium rounded-lg py-3 border border-neutral-300`}
              >
                🚗 Auto piccola
              </button>
              <button
                type="button"
                onClick={() => handleTransportTypeSelect("suv_sw")}
                className={`${
                  selectedTransportType === "suv_sw"
                    ? "bg-secondary text-white"
                    : "bg-neutral-100 text-neutral-700"
                } font-medium rounded-lg py-3 border border-neutral-300`}
              >
                🚙 SUV / Station Wagon
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTransportTypeSelect("van_furgone")}
                className={`${
                  selectedTransportType === "van_furgone"
                    ? "bg-secondary text-white"
                    : "bg-neutral-100 text-neutral-700"
                } font-medium rounded-lg py-3 border border-neutral-300`}
              >
                🚐 Van / Furgone
              </button>
              <button
                type="button"
                onClick={() => handleTransportTypeSelect("bagaglio_aereo")}
                className={`${
                  selectedTransportType === "bagaglio_aereo"
                    ? "bg-secondary text-white"
                    : "bg-neutral-100 text-neutral-700"
                } font-medium rounded-lg py-3 border border-neutral-300`}
              >
                ✈️ Bagaglio aereo
              </button>
            </div>
            {errors.transportType && (
              <p className="text-red-500 text-sm mt-1">{errors.transportType.message}</p>
            )}
          </div>

          <div className="mb-6">
            <Label htmlFor="notes" className="block text-neutral-700 font-medium mb-2">Note (opzionale)</Label>
            <Textarea
              id="notes"
              className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-24 resize-none"
              placeholder="Qualsiasi informazione aggiuntiva..."
              {...register("notes")}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-secondary text-white font-medium rounded-lg py-4 mb-4 h-auto"
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
