import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import TripCard from "@/components/trips/trip-card";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db, createChatRoom } from "@/lib/firebase";
import { differenceInDays } from "date-fns";

interface TravelerType {
  id: string;
  name: string;
  photoURL?: string;
  rating: number;
  reviewCount: number;
}

interface TripType {
  id: string;
  traveler: TravelerType;
  from: string;
  to: string;
  date: string;
  capacity: number;
  daysToDeadline?: number;
}

export default function TravelersList() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const [packageDetails, setPackageDetails] = useState<any>(null);
  const [trips, setTrips] = useState<TripType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      try {
        // Fetch the user's most recent package
        const packagesQuery = query(
          collection(db, "packages"),
          where("userId", "==", currentUser.uid),
          where("status", "==", "pending")
        );
        const packagesSnapshot = await getDocs(packagesQuery);
        
        if (packagesSnapshot.empty) {
          navigate("/send-package");
          return;
        }
        
        // Get the most recent package
        const packages = packagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        const latestPackage = packages.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        
        setPackageDetails(latestPackage);
        
        // Fetch matching trips
        const tripsQuery = query(
          collection(db, "trips"),
          where("from", "==", latestPackage.from),
          where("to", "==", latestPackage.to),
          where("status", "==", "active")
        );
        const tripsSnapshot = await getDocs(tripsQuery);
        
        const tripPromises = tripsSnapshot.docs.map(async (tripDoc) => {
          const tripData = tripDoc.data();
          
          // Get traveler information
          const userQuery = query(
            collection(db, "users"),
            where("uid", "==", tripData.userId)
          );
          const userSnapshot = await getDocs(userQuery);
          
          if (userSnapshot.empty) {
            return null;
          }
          
          const userData = userSnapshot.docs[0].data();
          
          // Calculate days to deadline
          const tripDate = new Date(tripData.date);
          const packageDeadline = new Date(latestPackage.deadline);
          const daysToDeadline = differenceInDays(tripDate, packageDeadline);
          
          return {
            id: tripDoc.id,
            traveler: {
              id: userData.uid,
              name: userData.displayName || "Unknown User",
              photoURL: userData.photoURL,
              rating: userData.rating || 0,
              reviewCount: userData.reviewCount || 0
            },
            from: tripData.from,
            to: tripData.to,
            date: tripData.date,
            capacity: tripData.capacity,
            daysToDeadline
          };
        });
        
        const tripsData = (await Promise.all(tripPromises)).filter(trip => trip !== null) as TripType[];
        setTrips(tripsData);
        
      } catch (error) {
        console.error("Error fetching trips:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate]);

  const handleContactTraveler = async (tripId: string) => {
    if (!currentUser || !packageDetails) return;
    
    try {
      const trip = trips.find(t => t.id === tripId);
      if (!trip) return;
      
      // Create a chat room between the package sender and the traveler
      const chatRoom = await createChatRoom(
        currentUser.uid,
        trip.traveler.id,
        packageDetails.id,
        tripId
      );
      
      // Navigate to the chat screen
      navigate(`/chat/${chatRoom.id}`);
    } catch (error) {
      console.error("Error creating chat room:", error);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-neutral-500">Caricamento viaggiatori...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button className="p-2" onClick={() => navigate("/send-package")}>
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
            Viaggiatori Disponibili
          </h1>
        </div>

        {packageDetails && (
          <div className="bg-neutral-100 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-neutral-900 font-medium">Il tuo pacco</p>
                <p className="text-neutral-500">{packageDetails.from} → {packageDetails.to}</p>
              </div>
              <div className="text-right">
                <p className="text-neutral-900 font-medium">
                  Entro {new Date(packageDetails.deadline).toLocaleDateString("it-IT", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-neutral-500">{packageDetails.price}€ offerti</p>
              </div>
            </div>
          </div>
        )}

        {trips.length > 0 ? (
          trips.map((trip) => (
            <TripCard
              key={trip.id}
              id={trip.id}
              traveler={trip.traveler}
              from={trip.from}
              to={trip.to}
              date={trip.date}
              capacity={trip.capacity}
              daysToDeadline={trip.daysToDeadline}
              onContact={handleContactTraveler}
            />
          ))
        ) : (
          <div className="p-4 bg-neutral-100 rounded-lg text-center">
            <p className="text-neutral-500 mb-2">Nessun viaggiatore disponibile</p>
            <p className="text-sm text-neutral-500">
              Ti avviseremo quando nuovi viaggiatori corrispondono alle tue esigenze
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
