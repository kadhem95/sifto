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

// Schema validazione
const packageFormSchema = z.object({
  from: z.string().min(2, "È richiesta la località di partenza"),
  to: z.string().min(2, "È richiesta la località di destinazione"),
  deadline: z.string().min(1, "È richiesta una data di scadenza"),
  description: z.string().min(3, "Inserisci una descrizione del pacco"),
  dimensions: z.string().min(1, "Seleziona una taglia per il tuo pacco"),
  price: z.coerce.number().min(1, "Inserisci un prezzo valido"),
});

type PackageFormValues = z.infer<typeof packageFormSchema>;

export default function SendPackage() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("");

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

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    setValue("dimensions", size);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: PackageFormValues) => {
    if (!currentUser) {
      // Reindirizza alla pagina di login se l'utente non è autenticato
      navigate("/login");
      return;
    }

    try {
      setIsLoading(true);

      // Crea il pacco
      const packageData = {
        ...data,
        userId: currentUser.uid,
        status: "pending", // pending, in_progress, completed
        createdAt: new Date().toISOString(),
      };

      const packageId = await createPackage(packageData);

      // Se è stata caricata un'immagine, caricala
      if (imageFile && packageId) {
        await uploadPackageImage(packageId, imageFile);
      }

      // Reindirizza alla pagina dei miei pacchi
      navigate("/my-shipments");
    } catch (error) {
      console.error("Errore durante l'invio del pacco:", error);
      alert("Si è verificato un errore durante l'invio del pacco. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-lg mx-auto py-6 px-4">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-neutral-800">
            Invia un pacco
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

          {/* Data di consegna */}
          <div className="mb-4">
            <Label htmlFor="deadline" className="block text-neutral-700 font-medium mb-2">Entro quando</Label>
            <Input
              id="deadline"
              type="date"
              className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
              {...register("deadline")}
            />
            {errors.deadline && (
              <p className="text-red-500 text-sm mt-1">{errors.deadline.message}</p>
            )}
          </div>

          {/* Descrizione del pacco */}
          <div className="mb-4">
            <Label htmlFor="description" className="block text-neutral-700 font-medium mb-2">Descrizione</Label>
            <Input
              id="description"
              type="text"
              className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
              placeholder="Descrivi brevemente il tuo pacco"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Dimensioni del pacco */}
          <div className="mb-4">
            <Label className="block text-neutral-700 font-medium mb-2">Dimensioni del pacco</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={selectedSize === "small" ? "default" : "outline"}
                className={`flex-1 ${selectedSize === "small" ? "bg-blue-600" : ""}`}
                onClick={() => handleSizeSelect("small")}
              >
                Piccolo
              </Button>
              <Button
                type="button"
                variant={selectedSize === "medium" ? "default" : "outline"}
                className={`flex-1 ${selectedSize === "medium" ? "bg-blue-600" : ""}`}
                onClick={() => handleSizeSelect("medium")}
              >
                Medio
              </Button>
              <Button
                type="button"
                variant={selectedSize === "large" ? "default" : "outline"}
                className={`flex-1 ${selectedSize === "large" ? "bg-blue-600" : ""}`}
                onClick={() => handleSizeSelect("large")}
              >
                Grande
              </Button>
            </div>
            {errors.dimensions && (
              <p className="text-red-500 text-sm mt-1">{errors.dimensions.message}</p>
            )}
          </div>

          {/* Prezzo */}
          <div className="mb-4">
            <Label htmlFor="price" className="block text-neutral-700 font-medium mb-2">Prezzo (€)</Label>
            <Input
              id="price"
              type="number"
              min="1"
              step="1"
              className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
              placeholder="50"
              {...register("price")}
            />
            {errors.price && (
              <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
            )}
          </div>

          {/* Caricamento immagine */}
          <div className="mb-6">
            <Label htmlFor="image" className="block text-neutral-700 font-medium mb-2">Immagine del pacco (opzionale)</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Anteprima pacco"
                  className="w-24 h-24 object-cover rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Pulsante di invio */}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
            disabled={isLoading}
          >
            {isLoading ? "Invio in corso..." : "Pubblica richiesta"}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}