import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { allCities, formatCityDisplay } from '@/data/cities';

interface City {
  name: string;
  province?: string;
  country: string;
}

interface CityAutocompleteProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export default function CityAutocomplete({
  id,
  label,
  value,
  onChange,
  placeholder = 'Seleziona una città',
  required = false,
  error
}: CityAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filtra le città in base all'input dell'utente
  useEffect(() => {
    if (inputValue.trim() === '') {
      setSuggestions([]);
      return;
    }

    const filteredCities = allCities.filter(city => {
      const fullCityString = formatCityDisplay(city).toLowerCase();
      return fullCityString.includes(inputValue.toLowerCase()) || 
             city.name.toLowerCase().includes(inputValue.toLowerCase());
    });

    setSuggestions(filteredCities.slice(0, 10)); // Limita a 10 suggerimenti
  }, [inputValue]);

  // Gestisce il click fuori dal componente per chiudere i suggerimenti
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Gestisce l'aggiornamento del valore quando l'utente digitava
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(true);
  };

  // Gestisce la selezione di una città dai suggerimenti
  const handleSelectCity = (city: City) => {
    const formattedCity = formatCityDisplay(city);
    setInputValue(formattedCity);
    onChange(formattedCity);
    setShowSuggestions(false);
  };

  return (
    <div className="mb-4" ref={wrapperRef}>
      <label htmlFor={id} className="block text-neutral-700 font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((city, index) => (
              <div
                key={index}
                className="px-4 py-2 hover:bg-neutral-100 cursor-pointer"
                onClick={() => handleSelectCity(city)}
              >
                {formatCityDisplay(city)}
              </div>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}