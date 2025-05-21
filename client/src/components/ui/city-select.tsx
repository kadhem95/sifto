import { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { italianCities, northAfricanCities } from '@/data/cities';

// Tipo per la città
type City = {
  name: string;
  province?: string;
  country: string;
};

// Proprietà del componente
interface CitySelectProps {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

// Formatta il testo di visualizzazione della città
function formatCityDisplay(city: City): string {
  if (city.province) {
    return `${city.name} (${city.province})`;
  }
  return `${city.name}, ${city.country}`;
}

// Lista completa delle città
const allCities: City[] = [...italianCities, ...northAfricanCities];

export function CitySelect({
  id,
  label,
  placeholder = "Seleziona una città",
  value,
  onChange,
  error
}: CitySelectProps) {
  // Gestione stato interno
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Filtra i suggerimenti in base al testo digitato
  function filterCities(text: string): City[] {
    if (!text.trim()) {
      // Se non c'è testo, mostra le prime città
      return allCities.slice(0, 8);
    }
    
    const lowerText = text.toLowerCase();
    return allCities
      .filter(city => {
        const cityName = city.name.toLowerCase();
        const cityCountry = city.country.toLowerCase();
        const cityProvince = city.province ? city.province.toLowerCase() : '';
        
        return cityName.includes(lowerText) || 
               cityCountry.includes(lowerText) || 
               cityProvince.includes(lowerText);
      })
      .slice(0, 8);
  }
  
  // Gestisce il cambio dell'input
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const filtered = filterCities(newValue);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }
  
  // Gestisce la selezione di una città
  function handleSelectCity(city: City) {
    const displayValue = formatCityDisplay(city);
    setInputValue(displayValue);
    onChange(displayValue);
    setShowSuggestions(false);
  }
  
  // Mostra suggerimenti quando l'utente clicca o seleziona l'input
  function handleFocus() {
    const filtered = filterCities(inputValue);
    setSuggestions(filtered);
    setShowSuggestions(true);
  }
  
  // Sincronizza il valore esterno con quello interno
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);
  
  // Chiude i suggerimenti quando si clicca fuori
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div className="mb-4" ref={wrapperRef}>
      <Label htmlFor={id} className="block text-neutral-700 font-medium mb-2">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onClick={handleFocus}
          autoComplete="off"
        />
        
        {showSuggestions && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white shadow-lg rounded-lg border border-neutral-200 max-h-60 overflow-y-auto">
            {suggestions.map((city, index) => (
              <div
                key={index}
                className="px-4 py-3 cursor-pointer hover:bg-neutral-100 transition-colors flex items-center"
                onClick={() => handleSelectCity(city)}
              >
                <div className="mr-2 text-neutral-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="font-medium">{formatCityDisplay(city)}</div>
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
      
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}