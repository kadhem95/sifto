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

const packageFormSchema = z.object({
  from: z.string().min(2, "È richiesta la località di origine"),
  to: z.string().min(2, "È richiesta la località di destinazione"),
  deadline: z.string().min(1, "È richiesta una data di scadenza"),
  size: z.enum(["small", "medium", "large"]),
  price: z.coerce.number().min(1, "Inserisci un prezzo valido"),
});

type PackageFormValues = z.infer<typeof packageFormSchema>;

export default function SendPackage() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSize, setSelectedSize] = useState<"small" | "medium" | "large">("small");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      from: "",
      to: "",
      deadline: "",
      size: "small",
      price: 0,
    },
  });

  const handleSizeSelect = (size: "small" | "medium" | "large") => {
    setSelectedSize(size);
    setValue("size", size);
  };

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

    setIsLoading(true);

    try {
      // Create the package document
      const packageRef = await createPackage({
        userId: currentUser.uid,
        from: data.from,
        to: data.to,
        deadline: data.deadline,
        size: data.size,
        price: data.price,
        createdAt: new Date().toISOString(),
      });

      // If there's an image, upload it
      if (imageFile && packageRef.id) {
        await uploadPackageImage(packageRef.id, imageFile);
      }

      // Navigate to the travelers list screen
      navigate("/travelers");
    } catch (error) {
      console.error("Error creating package:", error);
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
          <div className="mb-4">
            <Label htmlFor="from" className="block text-neutral-700 font-medium mb-2">Da</Label>
            <div className="relative">
              <Input
                id="from"
                className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
                placeholder="es. Milano"
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
              placeholder="es. Tunisi"
              {...register("to")}
            />
            {errors.to && (
              <p className="text-red-500 text-sm mt-1">{errors.to.message}</p>
            )}
          </div>

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

          <div className="mb-4">
            <Label className="block text-neutral-700 font-medium mb-2">Dimensione del pacco</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleSizeSelect("small")}
                className={`${
                  selectedSize === "small"
                    ? "bg-primary text-white"
                    : "bg-neutral-100 text-neutral-700"
                } font-medium rounded-lg py-3 flex flex-col items-center border border-neutral-300`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17A3 3 0 015 5zm4 1V5a1 1 0 10-2 0v1H5a1 1 0 100 2h2v1a3 3 0 006 0V8h2a1 1 0 100-2h-2V5a1 1 0 10-2 0v1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                Piccolo
              </button>
              <button
                type="button"
                onClick={() => handleSizeSelect("medium")}
                className={`${
                  selectedSize === "medium"
                    ? "bg-primary text-white"
                    : "bg-neutral-100 text-neutral-700"
                } font-medium rounded-lg py-3 flex flex-col items-center border border-neutral-300`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17A3 3 0 015 5zm4 1V5a1 1 0 10-2 0v1H5a1 1 0 100 2h2v1a3 3 0 006 0V8h2a1 1 0 100-2h-2V5a1 1 0 10-2 0v1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                Medio
              </button>
              <button
                type="button"
                onClick={() => handleSizeSelect("large")}
                className={`${
                  selectedSize === "large"
                    ? "bg-primary text-white"
                    : "bg-neutral-100 text-neutral-700"
                } font-medium rounded-lg py-3 flex flex-col items-center border border-neutral-300`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17A3 3 0 015 5zm4 1V5a1 1 0 10-2 0v1H5a1 1 0 100 2h2v1a3 3 0 006 0V8h2a1 1 0 100-2h-2V5a1 1 0 10-2 0v1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                Grande
              </button>
            </div>
            {errors.size && (
              <p className="text-red-500 text-sm mt-1">{errors.size.message}</p>
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
            <Label htmlFor="image" className="block text-neutral-700 font-medium mb-2">Foto del pacco (opzionale)</Label>
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
                  <p className="text-neutral-500">Tocca per caricare</p>
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
              "Trova Viaggiatori"
            )}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
