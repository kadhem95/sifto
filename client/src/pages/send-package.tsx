import { useState, useRef, useEffect } from "react";
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
import { allCities, formatCityDisplay } from "@/data/cities";

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
  
  // Stati per autocompletamento località di partenza
  const [fromInputValue, setFromInputValue] = useState("");
  const [fromSuggestions, setFromSuggestions] = useState<{name: string; province?: string; country: string}[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const fromInputRef = useRef<HTMLDivElement>(null);
  
  // Stati per autocompletamento località di destinazione
  const [toInputValue, setToInputValue] = useState("");
  const [toSuggestions, setToSuggestions] = useState<{name: string; province?: string; country: string}[]>([]);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const toInputRef = useRef<HTMLDivElement>(null);
  
  // Funzione per filtrare i suggerimenti delle città
  const filterCitySuggestions = (text: string) => {
    if (!text.trim()) {
      return [];
    }
    
    return allCities
      .filter(city => {
        const cityName = city.name.toLowerCase();
        const cityProvince = city.province ? city.province.toLowerCase() : '';
        const cityCountry = city.country.toLowerCase();
        const searchText = text.toLowerCase();
        
        return cityName.includes(searchText) || 
               cityProvince.includes(searchText) || 
               cityCountry.includes(searchText);
      })
      .slice(0, 8); // Limita a 8 suggerimenti
  };
  
  // Gestione input per località di partenza
  const handleFromInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFromInputValue(value);
    
    // Aggiorna i suggerimenti
    const suggestions = filterCitySuggestions(value);
    setFromSuggestions(suggestions);
    setShowFromSuggestions(suggestions.length > 0);
  };
  
  // Gestione input per località di destinazione
  const handleToInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setToInputValue(value);
    
    // Aggiorna i suggerimenti
    const suggestions = filterCitySuggestions(value);
    setToSuggestions(suggestions);
    setShowToSuggestions(suggestions.length > 0);
  };
  
  // Gestione selezione città di partenza
  const selectFromCity = (city: {name: string; province?: string; country: string}) => {
    const cityDisplay = formatCityDisplay(city);
    setFromInputValue(cityDisplay);
    setValue("from", cityDisplay, { shouldValidate: true });
    setShowFromSuggestions(false);
  };
  
  // Gestione selezione città di destinazione
  const selectToCity = (city: {name: string; province?: string; country: string}) => {
    const cityDisplay = formatCityDisplay(city);
    setToInputValue(cityDisplay);
    setValue("to", cityDisplay, { shouldValidate: true });
    setShowToSuggestions(false);
  };
  
  // Gestisce click fuori dai dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Chiudi suggerimenti località partenza
      if (fromInputRef.current && !fromInputRef.current.contains(event.target as Node)) {
        setShowFromSuggestions(false);
      }
      // Chiudi suggerimenti località destinazione
      if (toInputRef.current && !toInputRef.current.contains(event.target as Node)) {
        setShowToSuggestions(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Sincronizza i valori degli input con i valori del form
  useEffect(() => {
    const fromValue = watch("from");
    const toValue = watch("to");
    
    if (fromValue && fromValue !== fromInputValue) {
      setFromInputValue(fromValue);
    }
    
    if (toValue && toValue !== toInputValue) {
      setToInputValue(toValue);
    }
  }, [watch("from"), watch("to")]);

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
        description: data.description,
        dimensions: data.dimensions || "",
        price: data.price,
        createdAt: new Date().toISOString(),
      });

      // If there's an image, upload it
      if (imageFile && packageRef.id) {
        await uploadPackageImage(packageRef.id, imageFile);
      }

      // Navigate to confirmation screen or my shipments
      navigate("/my-shipments");
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
          {/* Località di partenza */}
          <div className="mb-4">
            <Label htmlFor="from" className="block text-neutral-700 font-medium mb-2">Da</Label>
            <div className="relative">
              <div ref={fromInputRef}>
                <Input
                  id="from"
                  type="text"
                  className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
                  placeholder="es. Milano"
                  value={fromInputValue}
                  onChange={handleFromInputChange}
                  onFocus={() => setShowFromSuggestions(true)}
                  autoComplete="off"
                />
                
                {showFromSuggestions && fromSuggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white shadow-lg rounded-lg border border-neutral-200 max-h-60 overflow-y-auto">
                    {fromSuggestions.map((city, index) => (
                      <div
                        key={index}
                        className="px-4 py-3 cursor-pointer hover:bg-neutral-100 transition-colors flex items-center"
                        onClick={() => selectFromCity(city)}
                      >
                        <div className="mr-2 text-neutral-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="font-medium flex-1">{formatCityDisplay(city)}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="absolute right-3 top-3">
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
                </div>
              </div>
              
              {errors.from && (
                <p className="text-red-500 text-sm mt-1">{errors.from.message}</p>
              )}
            </div>
          </div>

          {/* Località di destinazione */}
          <div className="mb-4">
            <Label htmlFor="to" className="block text-neutral-700 font-medium mb-2">A</Label>
            <div className="relative">
              <div ref={toInputRef}>
                <Input
                  id="to"
                  type="text"
                  className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
                  placeholder="es. Tunisi"
                  value={toInputValue}
                  onChange={handleToInputChange}
                  onFocus={() => setShowToSuggestions(true)}
                  autoComplete="off"
                />
                
                {showToSuggestions && toSuggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white shadow-lg rounded-lg border border-neutral-200 max-h-60 overflow-y-auto">
                    {toSuggestions.map((city, index) => (
                      <div
                        key={index}
                        className="px-4 py-3 cursor-pointer hover:bg-neutral-100 transition-colors flex items-center"
                        onClick={() => selectToCity(city)}
                      >
                        <div className="mr-2 text-neutral-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="font-medium flex-1">{formatCityDisplay(city)}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="absolute right-3 top-3">
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
                </div>
              </div>
              
              {errors.to && (
                <p className="text-red-500 text-sm mt-1">{errors.to.message}</p>
              )}
            </div>
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

          {/* Descrizione */}
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
          
          {/* Misure */}
          <div className="mb-4">
            <Label className="block text-neutral-700 font-medium mb-2">Misure</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleSizeSelect("piccolo")}
                className={`font-medium rounded-lg py-3 border transition-colors
                  ${selectedSize === "piccolo" 
                    ? "bg-primary text-white" 
                    : "bg-neutral-100 text-neutral-700"}`}
              >
                🔹 Piccolo
              </button>
              <button
                type="button"
                onClick={() => handleSizeSelect("medio")}
                className={`font-medium rounded-lg py-3 border transition-colors
                  ${selectedSize === "medio" 
                    ? "bg-primary text-white" 
                    : "bg-neutral-100 text-neutral-700"}`}
              >
                🔹 Medio
              </button>
              <button
                type="button"
                onClick={() => handleSizeSelect("grande")}
                className={`font-medium rounded-lg py-3 border transition-colors
                  ${selectedSize === "grande" 
                    ? "bg-primary text-white" 
                    : "bg-neutral-100 text-neutral-700"}`}
              >
                🔹 Grande
              </button>
            </div>
            <input type="hidden" {...register("dimensions")} />
            {errors.dimensions && (
              <p className="text-red-500 text-sm mt-1">{errors.dimensions.message}</p>
            )}
          </div>

          {/* Foto del pacco */}
          <div className="mb-4">
            <Label htmlFor="image" className="block text-neutral-700 font-medium mb-2">Foto del pacco (facoltativo)</Label>
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

          {/* Offerta */}
          <div className="mb-6">
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

          {/* Pulsante pubblica */}
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-blue-400 text-white font-medium rounded-lg py-4 mb-4 h-auto transition-all duration-200 active:scale-[0.98] active:opacity-90"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Elaborazione in corso...
              </div>
            ) : (
              "Pubblica richiesta"
            )}
          </Button>
          <p className="text-sm text-center text-neutral-500 mb-4">
            Una volta pubblicata la richiesta, i viaggiatori compatibili potranno accettarla e contattarti.
          </p>
        </form>
      </div>
    </AppLayout>
  );
}