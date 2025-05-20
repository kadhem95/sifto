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
      <div className="p-6 pb-20">
        {/* JIBLI Logo and Branding */}
        <div className="flex flex-col items-center mb-8 pt-4">
          <h1 className="jibli-logo mb-1">JIBLI</h1>
          <h2 className="text-2xl font-bold text-center mb-2">
            Hai un pacco? JIBLI.
          </h2>
          <p className="text-center text-gray-600 mb-4">
            Spedisci con chi viaggia tra Europa e Maghreb.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Send Package Card */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
                alt="Person packing a box for shipping"
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end">
                <h2 className="text-2xl font-bold text-white p-4">
                  Fratello, hai un pacco da mandare?
                </h2>
              </div>
            </div>
            <div className="p-5">
              <p className="text-gray-600 mb-4">
                Trova viaggiatori diretti alla tua destinazione che possono trasportare il tuo pacco. Facile, veloce e affidabile.
              </p>
              <p className="text-sm italic text-gray-500 mb-4">
                "Ogni viaggio è un favore che torna"
              </p>
              <Button
                onClick={handleSendPackage}
                className="jibli-button-primary w-full flex items-center justify-center"
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
                Spedisci un pacco
              </Button>
            </div>
          </div>

          {/* Travel Card */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1499591934245-40b55745b905?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
                alt="Person traveling with luggage"
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end">
                <h2 className="text-2xl font-bold text-white p-4">
                  Hai spazio per portare qualcosa?
                </h2>
              </div>
            </div>
            <div className="p-5">
              <p className="text-gray-600 mb-4">
                Raccontaci del tuo prossimo viaggio e guadagna consegnando pacchi a chi ne ha bisogno.
              </p>
              <p className="text-sm italic text-gray-500 mb-4">
                "JIBLI lo porta a chi ami"
              </p>
              <Button
                onClick={handleReportTrip}
                className="jibli-button-secondary w-full flex items-center justify-center"
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
                Segnala un viaggio
              </Button>
            </div>
          </div>
          
          {/* Disclaimer */}
          <div className="mt-4 px-2 text-center text-sm text-gray-500">
            <p>JIBLI non controlla i pacchi. Fidati di chi viaggia, valuta e scegli con intelligenza.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
