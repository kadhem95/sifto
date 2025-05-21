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
import { createPackage, uploadPackageImage } from "@/lib/firebase";
import { LocationInput } from "@/components/ui/location-input";
import { DatePicker } from "@/components/ui/date-picker";

const packageFormSchema = z.object({
  from: z.string().min(2, "È richiesta la località di origine"),
  to: z.string().min(2, "È richiesta la località di destinazione"),
  deadline: z.string().min(1, "È richiesta una data di scadenza"),
  description: z.string().min(3, "Inserisci una descrizione del pacco"),
  dimensions: z.string().optional(),
  price: z.coerce.number().min(1, "Inserisci un prezzo valido"),
});

type PackageFormValues = z.infer<typeof packageFormSchema>;

export default function SendPackage() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      from: "",
      to: "",
      deadline: "",
      description: "",
      dimensions: "",
      price: 0,
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: PackageFormValues) => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    if (!imageFile) {
      alert("Per favore, carica una foto del tuo pacco");
      return;
    }

    setIsLoading(true);

    try {
      // Create the package document with all required data
      const packageRef = await createPackage({
        userId: currentUser.uid,
        from: data.from,
        to: data.to,
        deadline: data.deadline,
        description: data.description,
        dimensions: data.dimensions || "",
        price: data.price,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      // If there's an image, upload it with proper error handling
      if (imageFile && packageRef.id) {
        try {
          await uploadPackageImage(packageRef.id, imageFile);
        } catch (imageError) {
          console.error("Errore durante il caricamento dell'immagine:", imageError);
          // Continua comunque con il reindirizzamento anche se l'immagine non è stata caricata
        }
      }

      // Reindirizza immediatamente alla sezione "Le mie attività" con il tab pacchi attivo
      navigate("/my-shipments?tab=packages");
    } catch (error) {
      console.error("Errore durante la creazione del pacco:", error);
      alert("Si è verificato un errore. Riprova più tardi.");
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
            Invia un Pacco
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Località di partenza con autocompletamento */}
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

          {/* Località di destinazione con autocompletamento */}
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

          {/* Data di consegna con selettore moderno */}
          <DatePicker
            label="Entro quando"
            value={watch("deadline")}
            onChange={(value) => setValue("deadline", value, { shouldValidate: true })}
            error={errors.deadline?.message}
          />

          <div className="mb-4">
            <Label htmlFor="description" className="block text-neutral-700 font-medium mb-2">Descrizione del pacco</Label>
            <textarea
              id="description"
              className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto resize-none"
              placeholder="es. Scarpe da ginnastica in scatola, leggere, non fragili"
              rows={3}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>
          
          <div className="mb-4">
            <Label htmlFor="dimensions" className="block text-neutral-700 font-medium mb-2">Misure (cm) - opzionale</Label>
            <Input
              id="dimensions"
              className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
              placeholder="es. 40 x 30 x 20 cm"
              {...register("dimensions")}
            />
            {errors.dimensions && (
              <p className="text-red-500 text-sm mt-1">{errors.dimensions.message}</p>
            )}
          </div>

          <div className="mb-4">
            <Label htmlFor="price" className="block text-neutral-700 font-medium mb-2">La tua offerta (€)</Label>
            <Input
              id="price"
              type="number"
              className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
              placeholder="es. 20"
              {...register("price")}
            />
            {errors.price && (
              <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
            )}
          </div>

          <div className="mb-6">
            <Label htmlFor="image" className="block text-neutral-700 font-medium mb-2">Foto del pacco (obbligatorio)</Label>
            <label 
              htmlFor="image"
              className="border-2 border-dashed border-neutral-300 rounded-lg p-4 text-center block cursor-pointer"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Package preview" className="h-32 mx-auto object-contain" />
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 mx-auto text-neutral-400 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-neutral-500">Tocca per caricare una foto del tuo pacco</p>
                  <p className="text-xs text-neutral-400">Aiuta i viaggiatori a capire cosa trasporteranno</p>
                </>
              )}
              <input
                id="image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-white font-medium rounded-lg py-4 mb-4 h-auto"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Elaborazione in corso...
              </div>
            ) : (
              "Pubblica il pacco"
            )}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}