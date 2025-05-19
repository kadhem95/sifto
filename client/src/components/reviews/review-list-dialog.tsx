import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Rating } from "@/components/ui/rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ReviewListDialogProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReviewListDialog({ userId, userName, isOpen, onClose }: ReviewListDialogProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchReviews();
    }
  }, [isOpen, userId]);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      // Fetch reviews for the user
      const reviewsQuery = query(
        collection(db, "reviews"),
        where("receiverId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(20) // Mostra più recensioni rispetto alla pagina profilo
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);
      
      const reviewsData = await Promise.all(
        reviewsSnapshot.docs.map(async (doc) => {
          const reviewData = doc.data();
          
          // Get sender info
          const userQuery = query(
            collection(db, "users"),
            where("uid", "==", reviewData.senderId)
          );
          const userSnapshot = await getDocs(userQuery);
          
          const userData = !userSnapshot.empty ? userSnapshot.docs[0].data() : null;
          
          return {
            id: doc.id,
            ...reviewData,
            sender: userData ? {
              name: userData.displayName || "Utente sconosciuto",
              photoURL: userData.photoURL
            } : null
          };
        })
      );
      
      setReviews(reviewsData);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Data sconosciuta";
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("it-IT", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return "Data non valida";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-neutral-900">
            Recensioni di {userName}
          </DialogTitle>
          <DialogDescription>
            Cosa dicono gli altri utenti di {userName}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-500">Nessuna recensione trovata</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-neutral-100 pb-4 last:border-0">
                  <div className="flex items-start">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={review.sender?.photoURL} alt={review.sender?.name} />
                      <AvatarFallback>{review.sender?.name.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-neutral-900">{review.sender?.name || "Anonimo"}</p>
                          <div className="flex items-center">
                            <Rating value={review.rating} readOnly size="sm" />
                            <span className="text-xs text-neutral-500 ml-2">
                              {formatDate(review.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-neutral-700 mt-1">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}