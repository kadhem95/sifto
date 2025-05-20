import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Package2, Plane } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();

  const handleSendPackage = () => {
    navigate("/send-package");
  };

  const handleReportTrip = () => {
    navigate("/report-trip");
  };

  const handleBrowsePackages = () => {
    navigate("/packages");
  };

  const handleBrowseTravelers = () => {
    navigate("/travelers");
  };

  return (
    <AppLayout>
      <div className="p-6 mb-16">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6 mb-8">
          <h1 className="text-2xl font-bold text-secondary mb-2">
            Jibli, il ponte tra Europa e Nord Africa
          </h1>
          <p className="text-neutral-600 mb-4">
            Ogni viaggio può aiutare qualcuno. Ogni consegna è un legame che si crea.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Button
              onClick={handleBrowsePackages}
              variant="secondary"
              className="text-white rounded-full px-4"
            >
              Pacchi disponibili
            </Button>
            <Button
              onClick={handleBrowseTravelers} 
              variant="outline"
              className="bg-white/80 rounded-full px-4"
            >
              Viaggiatori
            </Button>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-secondary mb-6">
          Cosa vorresti fare oggi?
        </h2>

        <div className="flex flex-col gap-5">
          {/* Send Package Card */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
                alt="Persona che prepara un pacco da spedire"
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                <div className="p-4 text-white">
                  <span className="bg-primary/90 text-white text-xs font-medium px-2.5 py-1 rounded">Spedisci qualcosa a chi ami</span>
                </div>
              </div>
            </div>
            <div className="p-5">
              <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                Spedisci un Pacco
              </h2>
              <p className="text-neutral-600 mb-4">
                Trova qualcuno che viaggia verso la tua destinazione e affidagli il tuo pacco. Più semplice ed economico di un corriere tradizionale.
              </p>
              <Button
                onClick={handleSendPackage}
                className="w-full bg-primary text-white font-medium rounded-xl py-4 h-auto flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <Package2 className="h-5 w-5 mr-2" />
                Spedisci un Pacco
              </Button>
            </div>
          </div>

          {/* Travel Card */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1499591934245-40b55745b905?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
                alt="Persona che viaggia con bagagli"
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                <div className="p-4 text-white">
                  <span className="bg-secondary/90 text-white text-xs font-medium px-2.5 py-1 rounded">Aiuta qualcuno e guadagna</span>
                </div>
              </div>
            </div>
            <div className="p-5">
              <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                Condividi il tuo Viaggio
              </h2>
              <p className="text-neutral-600 mb-4">
                Stai viaggiando tra Europa e Nord Africa? Puoi aiutare chi ha bisogno di spedire qualcosa e guadagnare nel frattempo. Non è solo una consegna, è un legame che si crea.
              </p>
              <Button
                onClick={handleReportTrip}
                className="w-full bg-secondary text-white font-medium rounded-xl py-4 h-auto flex items-center justify-center hover:bg-secondary/90 transition-colors"
              >
                <Plane className="h-5 w-5 mr-2" />
                Condividi il tuo Viaggio
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
