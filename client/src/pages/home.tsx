import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();

  const handleSendPackage = () => {
    navigate("/send-package");
  };

  const handleReportTrip = () => {
    navigate("/report-trip");
  };

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6">
          Cosa vorresti fare oggi?
        </h1>

        <div className="flex flex-col gap-4">
          {/* Send Package Card */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
              alt="Person packing a box for shipping"
              className="w-full h-48 object-cover"
            />
            <div className="p-5">
              <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                Invia un Pacco
              </h2>
              <p className="text-neutral-500 mb-4">
                Trova viaggiatori diretti alla tua destinazione che possono trasportare il tuo pacco
              </p>
              <Button
                onClick={handleSendPackage}
                className="w-full bg-primary hover:bg-blue-400 text-white font-medium rounded-lg py-4 h-auto flex items-center justify-center transition-all duration-200 active:scale-[0.98] active:opacity-90"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17A3 3 0 015 5zm4 1V5a1 1 0 10-2 0v1H5a1 1 0 100 2h2v1a3 3 0 006 0V8h2a1 1 0 100-2h-2V5a1 1 0 10-2 0v1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                Invia un Pacco
              </Button>
            </div>
          </div>

          {/* Travel Card */}
          <div className="bg-[#F2F7FC] rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1499591934245-40b55745b905?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
              alt="Person traveling with luggage"
              className="w-full h-48 object-cover"
            />
            <div className="p-5">
              <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                Aggiungi un viaggio
              </h2>
              <p className="text-neutral-500 mb-4">
                Guadagna portando pacchi lungo il tragitto.
              </p>
              <Button
                onClick={handleReportTrip}
                className="w-full bg-[#3DD598] hover:bg-[#5ae0ad] text-white font-medium rounded-lg py-4 h-auto flex items-center justify-center transition-all duration-200 active:scale-[0.98] active:opacity-90"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                    clipRule="evenodd"
                  />
                </svg>
                Aggiungi un viaggio
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
