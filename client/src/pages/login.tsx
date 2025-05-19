import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import PhoneInput from "@/components/auth/phone-input";
import { signInWithPhone } from "@/lib/firebase";

export default function Login() {
  const [, navigate] = useLocation();
  const { setPhoneConfirmation } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOTP = async (phoneNumber: string) => {
    setIsLoading(true);
    setError("");
    
    try {
      const confirmationResult = await signInWithPhone(phoneNumber, "recaptcha-container");
      setPhoneConfirmation(confirmationResult);
      navigate(`/verify?phone=${encodeURIComponent(phoneNumber)}`);
    } catch (error) {
      console.error("Error sending OTP:", error);
      setError("Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col justify-between p-6 min-h-screen">
      <div className="flex flex-col items-center justify-center mt-8">
        <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-14 w-14 text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-5h-1a1 1 0 01-1-1v-1a1 1 0 011-1h1V6a2 2 0 012-2h1.38l-1.73-1.73A1 1 0 0112.22 1h2.07a1 1 0 01.7.29l2.71 2.71a1 1 0 01.29.7 2 2 0 01-2 2H15v8a1 1 0 01-1 1h-.05a2.5 2.5 0 01-4.9 0H3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">PackShare</h1>
        <p className="text-neutral-500 text-center mb-8">
          Connect package senders with travelers
        </p>

        <div className="w-full mt-6">
          <p className="text-neutral-900 font-medium mb-2">
            Enter your phone number
          </p>
          <PhoneInput onSubmit={handleSendOTP} isLoading={isLoading} />
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
      </div>

      {/* Hidden recaptcha container */}
      <div id="recaptcha-container"></div>
    </div>
  );
}
