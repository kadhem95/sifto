import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PhoneInputProps {
  onSubmit: (phoneNumber: string) => void;
  isLoading: boolean;
}

const countryCodes = [
  { code: "+39", country: "Italy" },
  { code: "+216", country: "Tunisia" },
  { code: "+33", country: "France" },
  { code: "+49", country: "Germany" },
  { code: "+34", country: "Spain" },
];

export default function PhoneInput({ onSubmit, isLoading }: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState("+39");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phoneNumber.trim()) {
      setError("Please enter your phone number");
      return;
    }

    if (phoneNumber.length < 8) {
      setError("Please enter a valid phone number");
      return;
    }

    onSubmit(`${countryCode}${phoneNumber}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex w-full mb-1">
        <Select value={countryCode} onValueChange={setCountryCode}>
          <SelectTrigger className="bg-neutral-100 rounded-l-lg px-3 py-6 border border-neutral-300 text-neutral-900 w-24">
            <SelectValue placeholder={countryCode} />
          </SelectTrigger>
          <SelectContent>
            {countryCodes.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.code} ({country.country})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="tel"
          className="flex-1 bg-neutral-100 rounded-r-lg px-4 py-6 border border-neutral-300 text-neutral-900"
          placeholder="Phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      
      <p className="text-xs text-neutral-500 mt-2 mb-6">
        We'll send you a verification code via SMS
      </p>
      
      <Button
        type="submit"
        className="w-full bg-primary text-white font-medium rounded-lg py-6 h-auto"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Sending...
          </div>
        ) : (
          "Continue"
        )}
      </Button>
    </form>
  );
}
