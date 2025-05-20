import { Button } from "@/components/ui/button";

interface QuickActionButtonProps {
  text: string;
  onClick: () => void;
}

function QuickActionButton({ text, onClick }: QuickActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      className="bg-neutral-100 text-neutral-700 py-1 px-3 rounded-lg text-sm font-medium h-auto border-neutral-200"
    >
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
    <div className="p-3 border-t border-neutral-200 bg-white flex items-center">
      <div className="flex space-x-2 mb-2 mx-2 overflow-x-auto w-full">
        <QuickActionButton 
          text="📍 Punto d'incontro" 
          onClick={onMeetingPoint} 
        />
        <QuickActionButton 
          text="💸 Conferma prezzo" 
          onClick={onConfirmPrice} 
        />
        <QuickActionButton 
          text="📦 Pacco consegnato" 
          onClick={onDeliveryComplete} 
        />
      </div>
    </div>
  );
}
