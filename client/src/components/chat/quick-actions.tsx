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
          text="📍 Set meeting point" 
          onClick={onMeetingPoint} 
        />
        <QuickActionButton 
          text="💸 Confirm price" 
          onClick={onConfirmPrice} 
        />
        <QuickActionButton 
          text="📦 Delivery complete" 
          onClick={onDeliveryComplete} 
        />
      </div>
    </div>
  );
}
