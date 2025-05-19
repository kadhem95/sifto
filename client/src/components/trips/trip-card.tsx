import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Rating } from "@/components/ui/rating";

interface Traveler {
  id: string;
  name: string;
  photoURL?: string;
  rating: number;
  reviewCount: number;
}

interface TripCardProps {
  id: string;
  traveler: Traveler;
  from: string;
  to: string;
  date: string;
  capacity: number;
  daysToDeadline?: number;
  onContact: (tripId: string) => void;
  className?: string;
}

export default function TripCard({
  id,
  traveler,
  from,
  to,
  date,
  capacity,
  daysToDeadline,
  onContact,
  className = "",
}: TripCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const getDeadlineIndicator = () => {
    if (daysToDeadline === undefined) return null;
    
    if (daysToDeadline === 0) {
      return (
        <div className="bg-warning/10 text-warning px-3 py-1 rounded-full text-sm font-medium">
          Scadenza oggi
        </div>
      );
    } else if (daysToDeadline > 0) {
      return (
        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
          {daysToDeadline} {daysToDeadline === 1 ? 'giorno' : 'giorni'} alla scadenza
        </div>
      );
    } else {
      return (
        <div className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-sm font-medium">
          {Math.abs(daysToDeadline)} {Math.abs(daysToDeadline) === 1 ? 'giorno' : 'giorni'} di ritardo
        </div>
      );
    }
  };

  return (
    <div className={`bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-4 ${className}`}>
      <div className="p-4">
        <div className="flex items-center mb-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={traveler.photoURL} alt={traveler.name} />
            <AvatarFallback>{traveler.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <h3 className="text-neutral-900 font-medium">{traveler.name}</h3>
            <div className="flex items-center">
              <Rating value={traveler.rating} readOnly size="sm" />
              <span className="text-sm text-neutral-500 ml-1">
                {traveler.rating.toFixed(1)} ({traveler.reviewCount} recensioni)
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center py-2 border-t border-b border-neutral-200 my-2">
          <div>
            <p className="text-neutral-900">{from} → {to}</p>
            <p className="text-sm text-neutral-500">{formatDate(date)}</p>
          </div>
          {getDeadlineIndicator()}
        </div>

        <div className="mt-3 flex justify-between items-center">
          <span className="text-neutral-500">Spazio per {capacity} {capacity === 1 ? 'pacco' : 'pacchi'}</span>
          <Button
            onClick={() => onContact(id)}
            className="bg-primary text-white font-medium rounded-lg px-4 py-2 h-auto"
          >
            Contatta
          </Button>
        </div>
      </div>
    </div>
  );
}
