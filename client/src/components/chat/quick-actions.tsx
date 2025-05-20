import { Button } from "@/components/ui/button";

interface QuickActionButtonProps {
  text: string;
  icon: string;
  onClick: () => void;
  color: "primary" | "secondary" | "accent";
}

function QuickActionButton({ text, icon, onClick, color }: QuickActionButtonProps) {
  const colorClasses = {
    primary: "bg-[#E9FFF9] text-[#4AD8B7] border-[#4AD8B7]/30 hover:bg-[#4AD8B7] hover:text-white",
    secondary: "bg-[#f0f5ff] text-[#253b6b] border-[#253b6b]/30 hover:bg-[#253b6b] hover:text-white",
    accent: "bg-[#fff8e6] text-amber-600 border-amber-300/50 hover:bg-amber-500 hover:text-white"
  };

  return (
    <Button
      onClick={onClick}
      variant="outline"
      className={`py-2 px-4 rounded-xl text-sm font-medium h-auto transition-colors ${colorClasses[color]}`}
    >
      <span className="mr-2 text-lg">{icon}</span>
      {text}
    </Button>
  );
}

interface QuickActionsProps {
  onMeetingPoint: () => void;
  onConfirmPrice: () => void;
  onDeliveryComplete: () => void;
}

export default function QuickActions({
  onMeetingPoint,
  onConfirmPrice,
  onDeliveryComplete,
}: QuickActionsProps) {
  return (
    <div className="p-3 border-t border-[#4AD8B7]/20 bg-white">
      <p className="text-xs text-[#253b6b]/70 mb-2 ml-2 font-medium">Azioni rapide:</p>
      <div className="flex space-x-3 mb-1 mx-1 overflow-x-auto w-full py-1">
        <QuickActionButton 
          text="Punto d'incontro" 
          icon="📍"
          color="primary"
          onClick={onMeetingPoint} 
        />
        <QuickActionButton 
          text="Conferma prezzo" 
          icon="💸"
          color="secondary"
          onClick={onConfirmPrice} 
        />
        <QuickActionButton 
          text="Consegnato" 
          icon="📦"
          color="accent"
          onClick={onDeliveryComplete} 
        />
      </div>
      <p className="text-xs text-center text-[#253b6b]/60 italic mt-1">
        "Non è solo una consegna. È un favore, è un legame"
      </p>
    </div>
  );
}
