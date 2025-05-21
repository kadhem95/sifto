import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { allCities, formatCityDisplay } from '@/data/cities';

interface City {
  name: string;
  province?: string;
  country: string;
}

type LocationInputProps = {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function LocationInput({
  id,
  label,
  placeholder = "Seleziona una località",
  value,
  onChange,
  error
}: LocationInputProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sincronizza lo stato interno quando cambia il valore esterno
  useEffect(() => {
    if (value !== inputValue && !selectedCity) {
      setInputValue(value || '');
    }
  }, [value]);

  // Gestisce il click fuori dal componente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        
        // Se l'utente non ha selezionato una città validata, ripristina l'ultima valida
        if (selectedCity) {
          setInputValue(formatCityDisplay(selectedCity));
        } else if (value) {
          setInputValue(value);
        } else {
          setInputValue('');
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedCity, value]);

  // Aggiorna i suggerimenti quando l'utente digita
  const filterSuggestions = (text: string) => {
    if (!text.trim()) {
      return [];
    }
    
    // Filtra le città che contengono il testo digitato (case insensitive)
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Aggiorna i suggerimenti
    const newSuggestions = filterSuggestions(newValue);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
    
    // Resetta la selezione se l'utente cambia il testo
    setSelectedCity(null);
  };

  const handleSelectCity = (city: City) => {
    const cityString = formatCityDisplay(city);
    setInputValue(cityString);
    setSelectedCity(city);
    setShowSuggestions(false);
    onChange(cityString);
  };

  return (
    <div className="relative mb-4" ref={wrapperRef}>
      <label htmlFor={id} className="block text-neutral-700 font-medium mb-2">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onClick={() => {
            // Mostra sempre i primi suggerimenti quando si clicca sul campo
            // Se l'utente ha già iniziato a digitare, usa il filtro
            if (inputValue.length > 0) {
              const suggestions = filterSuggestions(inputValue);
              setSuggestions(suggestions);
              setShowSuggestions(suggestions.length > 0);
            } else {
              // Mostra le città più popolari come suggerimento iniziale
              const popularCities = allCities.slice(0, 8);
              setSuggestions(popularCities);
              setShowSuggestions(true);
            }
          }}
          onFocus={() => {
            // Mostra sempre i primi suggerimenti quando si seleziona il campo
            // Se l'utente ha già iniziato a digitare, usa il filtro
            if (inputValue.length > 0) {
              const suggestions = filterSuggestions(inputValue);
              setSuggestions(suggestions);
              setShowSuggestions(suggestions.length > 0);
            } else {
              // Mostra le città più popolari come suggerimento iniziale
              const popularCities = allCities.slice(0, 8);
              setSuggestions(popularCities);
              setShowSuggestions(true);
            }
          }}
          autoComplete="off"
        />
        
        {showSuggestions && suggestions.length > 0 && (
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
      
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}