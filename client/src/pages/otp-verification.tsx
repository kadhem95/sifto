import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import OtpInput from "@/components/auth/otp-input";
import { signInWithPhone, createUserProfile } from "@/lib/firebase";

export default function OtpVerification() {
  const [location, navigate] = useLocation();
  const { phoneConfirmation, currentUser, setPhoneConfirmation } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    // Extract phone number from URL query params
    const params = new URLSearchParams(location.split("?")[1]);
    const phone = params.get("phone");
    
    if (phone) {
      setPhoneNumber(phone);
    } else {
      navigate("/login");
    }

    // If user is already authenticated, redirect to home
    if (currentUser) {
      navigate("/");
    }

    // If no phone confirmation exists, redirect to login
    if (!phoneConfirmation && !currentUser) {
      navigate("/login");
    }
  }, [location, navigate, phoneConfirmation, currentUser]);

  const handleVerifyOTP = async (otp: string) => {
    if (!phoneConfirmation) {
      setError("Session expired. Please try again.");
      navigate("/login");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await phoneConfirmation.confirm(otp);
      const user = result.user;
      
      // Check if we need to create a profile for new users
      try {
        // For demo purposes, create a simple profile with first name initial + random letter
        const initials = phoneNumber.slice(-2);
        const randomName = `${initials.charAt(0).toUpperCase()}${String.fromCharCode(97 + Math.floor(Math.random() * 26))}.`;
        
        await createUserProfile(user.uid, {
          phoneNumber: user.phoneNumber,
          displayName: randomName,
          createdAt: new Date().toISOString()
        });
        
        navigate("/");
      } catch (profileError) {
        console.error("Error creating profile:", profileError);
        // Continue anyway since authentication succeeded
        navigate("/");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setError("Invalid verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const confirmationResult = await signInWithPhone(phoneNumber, "recaptcha-container");
      setPhoneConfirmation(confirmationResult);
    } catch (error) {
      console.error("Error resending OTP:", error);
      setError("Failed to resend verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center mb-6">
        <button className="p-2" onClick={() => navigate("/login")}>
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
          Verify your number
        </h1>
      </div>

      <OtpInput
        onSubmit={handleVerifyOTP}
        onResend={handleResendOTP}
        phoneNumber={phoneNumber}
        isLoading={isLoading}
      />

      {error && <p className="text-sm text-red-500 mt-4 text-center">{error}</p>}

      {/* Hidden recaptcha container */}
      <div id="recaptcha-container"></div>
    </div>
  );
}
