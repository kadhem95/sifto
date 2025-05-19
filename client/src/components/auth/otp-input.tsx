import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface OtpInputProps {
  length?: number;
  onSubmit: (otp: string) => void;
  onResend: () => void;
  phoneNumber: string;
  isLoading: boolean;
}

export default function OtpInput({
  length = 6,
  onSubmit,
  onResend,
  phoneNumber,
  isLoading,
}: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    
    if (isNaN(Number(value))) return;
    
    const newOtp = [...otp];
    
    // Allow only the last entered digit
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    
    // Move to next input if current field is filled
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Update error state
    setError("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      // Move to previous input on backspace if current field is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    
    if (isNaN(Number(pastedData))) return;
    
    const newOtp = [...otp];
    const pastedChars = pastedData.split("").slice(0, length);
    
    for (let i = 0; i < pastedChars.length; i++) {
      newOtp[i] = pastedChars[i];
    }
    
    setOtp(newOtp);
    
    // Focus the last filled input or the next empty one
    const lastFilledIndex = Math.min(pastedChars.length, length - 1);
    inputRefs.current[lastFilledIndex]?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const otpValue = otp.join("");
    
    if (otpValue.length !== length) {
      setError(`Please enter all ${length} digits`);
      return;
    }
    
    onSubmit(otpValue);
  };

  return (
    <form onSubmit={handleSubmit}>
      <p className="text-neutral-500 mb-6">Enter the code we sent to {phoneNumber}</p>
      
      <div className="flex justify-between mb-8">
        {Array.from({ length }, (_, index) => (
          <input
            key={index}
            type="text"
            ref={(el) => (inputRefs.current[index] = el)}
            value={otp[index]}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={index === 0 ? handlePaste : undefined}
            maxLength={1}
            className="w-12 h-12 text-center text-xl font-bold bg-neutral-100 rounded-lg border border-neutral-300"
          />
        ))}
      </div>
      
      {error && <p className="text-xs text-red-500 mb-4">{error}</p>}
      
      <Button
        type="submit"
        className="w-full bg-primary text-white font-medium rounded-lg py-4 h-auto mb-4"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Verifying...
          </div>
        ) : (
          "Verify"
        )}
      </Button>
      
      <p className="text-center text-neutral-500">
        Didn't receive the code?{" "}
        <button
          type="button"
          onClick={onResend}
          className="text-primary font-medium"
        >
          Resend
        </button>
      </p>
    </form>
  );
}
