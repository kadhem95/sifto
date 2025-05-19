import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { Rating } from "@/components/ui/rating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db, submitReview } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export default function Review() {
  const { id: receiverId } = useParams<{ id: string }>();
  const [location, navigate] = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [shipmentType, setShipmentType] = useState<"packages" | "trips" | null>(null);
  const [receiver, setReceiver] = useState<any | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [shipmentDetails, setShipmentDetails] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      // Extract query parameters
      const params = new URLSearchParams(location.split("?")[1]);
      const shipmentIdParam = params.get("shipmentId");
      const typeParam = params.get("type") as "packages" | "trips" | null;
      
      if (!shipmentIdParam || !typeParam) {
        toast({
          title: "Error",
          description: "Missing shipment information",
          variant: "destructive"
        });
        navigate("/my-shipments");
        return;
      }
      
      setShipmentId(shipmentIdParam);
      setShipmentType(typeParam);
      
      try {
        // Fetch receiver information
        const userQuery = query(
          collection(db, "users"),
          where("uid", "==", receiverId)
        );
        const userSnapshot = await getDocs(userQuery);
        
        if (userSnapshot.empty) {
          toast({
            title: "Error",
            description: "User not found",
            variant: "destructive"
          });
          navigate("/my-shipments");
          return;
        }
        
        setReceiver(userSnapshot.docs[0].data());
        
        // Fetch shipment details
        const shipmentRef = doc(db, typeParam, shipmentIdParam);
        const shipmentSnapshot = await getDoc(shipmentRef);
        
        if (!shipmentSnapshot.exists()) {
          toast({
            title: "Error",
            description: "Shipment not found",
            variant: "destructive"
          });
          navigate("/my-shipments");
          return;
        }
        
        setShipmentDetails(shipmentSnapshot.data());
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate, receiverId, location, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !shipmentId || !shipmentType || !receiverId) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const reviewData = {
        senderId: currentUser.uid,
        receiverId,
        packageId: shipmentType === "packages" ? shipmentId : undefined,
        tripId: shipmentType === "trips" ? shipmentId : undefined,
        rating,
        comment: comment.trim() || undefined,
      };
      
      await submitReview(reviewData);
      
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
      
      navigate("/my-shipments");
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-neutral-500">Loading...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button className="p-2" onClick={() => navigate("/my-shipments")}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-neutral-900"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-neutral-900 ml-2">
            Leave a Review
          </h1>
        </div>

        {receiver && shipmentDetails && (
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-6">
            <div className="p-4">
              <div className="flex items-center mb-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={receiver.photoURL} alt={receiver.displayName} />
                  <AvatarFallback>{receiver.displayName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <h3 className="text-neutral-900 font-medium">{receiver.displayName}</h3>
                  <p className="text-sm text-neutral-500">
                    {shipmentDetails.from} → {shipmentDetails.to}, 
                    {shipmentType === "packages" 
                      ? ` by ${formatDate(shipmentDetails.deadline)}` 
                      : ` ${formatDate(shipmentDetails.date)}`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-neutral-700 font-medium mb-3">Your rating</label>
            <div className="flex justify-center space-x-2">
              <Rating
                value={rating}
                onChange={setRating}
                count={5}
                size="lg"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-neutral-700 font-medium mb-2">Your comment</label>
            <Textarea
              className="w-full bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-32 resize-none"
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-white font-medium rounded-lg py-4 mb-4 h-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Submitting...
              </div>
            ) : (
              "Submit Review"
            )}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
