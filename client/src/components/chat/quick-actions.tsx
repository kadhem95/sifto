import { Button } from "@/components/ui/button";

interface QuickActionButtonProps {
  text: string;
  onClick: () => void;
  icon?: string;
}

function QuickActionButton({ text, onClick, icon }: QuickActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      className="bg-white text-neutral-700 py-2 px-3 rounded-full text-xs font-medium h-auto border border-neutral-200 shadow-sm whitespace-nowrap flex-shrink-0 hover:bg-neutral-50"
    >
      <span className="mr-1.5">{icon}</span> {text}
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
    <div className="p-2 border-t border-neutral-100 bg-white flex items-center overflow-hidden">
      <div className="flex gap-2 pb-1 px-1 overflow-x-auto w-full no-scrollbar">
        <QuickActionButton 
          icon="📍"
          text="Punto d'incontro" 
          onClick={onMeetingPoint} 
        />
        <QuickActionButton 
          icon="💸"
          text="Conferma prezzo" 
          onClick={onConfirmPrice} 
        />
        <QuickActionButton 
          icon="📦"
          text="Pacco consegnato" 
          onClick={onDeliveryComplete} 
        />
      </div>
    </div>
  );
}
