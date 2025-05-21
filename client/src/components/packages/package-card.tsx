import { useState } from "react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Rating } from "@/components/ui/rating";
import ReviewListDialog from "@/components/reviews/review-list-dialog";

interface PackageSender {
  id: string;
  name: string;
  photoURL?: string;
  rating: number;
  reviewCount: number;
}

interface PackageCardProps {
  id: string;
  sender: PackageSender;
  from: string;
  to: string;
  deadline: string;
  price: number;
  size: "small" | "medium" | "large";
  onAccept: (packageId: string) => void;
  className?: string;
}

export default function PackageCard({
  id,
  sender,
  from,
  to,
  deadline,
  price,
  size,
  onAccept,
  className = "",
}: PackageCardProps) {
  const [showReviews, setShowReviews] = useState(false);
  const getSizeColor = () => {
    switch (size) {
      case "small":
        return "bg-secondary";
      case "medium":
        return "bg-amber-500";
      case "large":
        return "bg-primary";
    }
  };

  const getSizeLabel = () => {
    switch (size) {
      case "small":
        return "Pacco piccolo";
      case "medium":
        return "Pacco medio";
      case "large":
        return "Pacco grande";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <>
      <div className={`bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-4 ${className}`}>
        <div className="p-4">
          <div className="flex items-center mb-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={sender.photoURL} alt={sender.name} />
              <AvatarFallback>{sender.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <h3 className="text-neutral-900 font-medium">{sender.name}</h3>
              <div 
                className="flex items-center cursor-pointer hover:opacity-80"
                onClick={() => setShowReviews(true)}
                title="Visualizza tutte le recensioni"
              >
                <Rating value={sender.rating} readOnly size="sm" />
                <span className="text-sm text-neutral-500 ml-1">
                  {sender.rating.toFixed(1)} ({sender.reviewCount} recensioni)
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center py-2 border-t border-b border-neutral-200 my-2">
            <div>
              <p className="text-neutral-900">{from} → {to}</p>
              <p className="text-sm text-neutral-500">Entro il {formatDate(deadline)}</p>
            </div>
            <div className="flex items-center">
              <span className="text-neutral-900 font-medium text-lg">{price}€</span>
              <span className="ml-1 text-sm text-neutral-500">offerti</span>
            </div>
          </div>

          <div className="mt-3 flex justify-between items-center">
            <div className="flex items-center">
              <span className={`inline-block w-3 h-3 ${getSizeColor()} rounded-full mr-2`}></span>
              <span className="text-neutral-500">{getSizeLabel()}</span>
            </div>
            <Button
              onClick={() => onAccept(id)}
              className="bg-[#3DD598] hover:bg-[#5ae0ad] text-white font-medium rounded-lg px-4 py-2 h-auto"
            >
              Accetta Pacco
            </Button>
          </div>
        </div>
      </div>
      
      {/* Dialog per mostrare tutte le recensioni */}
      <ReviewListDialog 
        userId={sender.id} 
        userName={sender.name}
        isOpen={showReviews}
        onClose={() => setShowReviews(false)}
      />
    </>
  );
}
