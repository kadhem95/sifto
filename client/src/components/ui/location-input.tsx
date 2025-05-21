import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { allCities, formatCityDisplay } from '@/data/cities';

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
  const [input, setInput] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setInput(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const userInput = e.target.value;
    setInput(userInput);

    // Filtra i suggerimenti
    if (userInput.trim() === '') {
      setSuggestions([]);
      return;
    }

    const filtered = allCities.filter(city => 
      formatCityDisplay(city).toLowerCase().includes(userInput.toLowerCase())
    );
    setSuggestions(filtered.slice(0, 8)); // Limita a 8 suggerimenti
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (city: any) => {
    const formattedCity = formatCityDisplay(city);
    setInput(formattedCity);
    onChange(formattedCity);
    setShowSuggestions(false);
  };

  return (
    <div className="relative" ref={inputRef}>
      <label htmlFor={id} className="block text-neutral-700 font-medium mb-2">
        {label}
      </label>
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto"
        value={input}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-lg border border-neutral-200 max-h-60 overflow-y-auto">
          {suggestions.map((city, index) => (
            <div
              key={index}
              className="px-4 py-2 cursor-pointer hover:bg-neutral-100"
              onClick={() => handleSelectSuggestion(city)}
            >
              {formatCityDisplay(city)}
            </div>
          ))}
        </div>
      )}
      
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}