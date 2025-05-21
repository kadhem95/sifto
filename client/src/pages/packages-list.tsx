import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import PackageCard from "@/components/packages/package-card";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, createChatRoom, createMatch } from "@/lib/firebase";

interface PackageSender {
  id: string;
  name: string;
  photoURL?: string;
  rating: number;
  reviewCount: number;
}

interface PackageType {
  id: string;
  sender: PackageSender;
  from: string;
  to: string;
  deadline: string;
  price: number;
  size: "small" | "medium" | "large";
}

export default function PackagesList() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const [tripDetails, setTripDetails] = useState<any>(null);
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      try {
        // Fetch the user's most recent trip
        const tripsQuery = query(
          collection(db, "trips"),
          where("userId", "==", currentUser.uid),
          where("status", "==", "active")
        );
        const tripsSnapshot = await getDocs(tripsQuery);
        
        if (tripsSnapshot.empty) {
          navigate("/report-trip");
          return;
        }
        
        // Get the most recent trip
        const trips = tripsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        const latestTrip = trips.sort((a, b) => {
          const dateA = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          const dateB = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          return dateA - dateB;
        })[0];
        
        setTripDetails(latestTrip);
        
        // Fetch matching packages
        const packagesQuery = query(
          collection(db, "packages"),
          where("from", "==", latestTrip.from || ""),
          where("to", "==", latestTrip.to || ""),
          where("status", "==", "pending")
        );
        const packagesSnapshot = await getDocs(packagesQuery);
        
        const packagePromises = packagesSnapshot.docs.map(async (packageDoc) => {
          const packageData = packageDoc.data();
          
          // Get sender information
          const userQuery = query(
            collection(db, "users"),
            where("uid", "==", packageData.userId)
          );
          const userSnapshot = await getDocs(userQuery);
          
          if (userSnapshot.empty) {
            return null;
          }
          
          const userData = userSnapshot.docs[0].data();
          
          return {
            id: packageDoc.id,
            sender: {
              id: userData.uid,
              name: userData.displayName || "Unknown User",
              photoURL: userData.photoURL,
              rating: userData.rating || 0,
              reviewCount: userData.reviewCount || 0
            },
            from: packageData.from,
            to: packageData.to,
            deadline: packageData.deadline,
            price: packageData.price,
            size: packageData.size
          };
        });
        
        const packagesData = (await Promise.all(packagePromises)).filter(pkg => pkg !== null) as PackageType[];
        setPackages(packagesData);
        
      } catch (error) {
        console.error("Error fetching packages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate]);

  const handleAcceptPackage = async (packageId: string) => {
    if (!currentUser || !tripDetails) return;
    
    try {
      const pkg = packages.find(p => p.id === packageId);
      if (!pkg) return;
      
      // Create a match between the package and the trip
      const matchRef = await createMatch({
        packageId: packageId,
        tripId: tripDetails.id,
        travelerId: currentUser.uid,
        senderId: pkg.sender.id,
        status: "accepted",
        createdAt: new Date().toISOString()
      });
      
      // Create a chat room between the traveler and the package sender
      const chatRoom = await createChatRoom(
        currentUser.uid,
        pkg.sender.id,
        packageId,
        tripDetails.id
      );
      
      // Navigate to the chat screen
      navigate(`/chat/${chatRoom.id}`);
    } catch (error) {
      console.error("Error accepting package:", error);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-neutral-500">Caricamento pacchi...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button className="p-2" onClick={() => navigate("/report-trip")}>
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
            Pacchi Disponibili
          </h1>
        </div>

        {tripDetails && (
          <div className="bg-neutral-100 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-neutral-900 font-medium">Il tuo viaggio</p>
                <p className="text-neutral-500">{tripDetails.from} → {tripDetails.to}</p>
              </div>
              <div className="text-right">
                <p className="text-neutral-900 font-medium">
                  {new Date(tripDetails.date).toLocaleDateString("it-IT", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-neutral-500">Spazio per {tripDetails.capacity} {tripDetails.capacity === 1 ? 'pacco' : 'pacchi'}</p>
              </div>
            </div>
          </div>
        )}

        {packages.length > 0 ? (
          packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              id={pkg.id}
              sender={pkg.sender}
              from={pkg.from}
              to={pkg.to}
              deadline={pkg.deadline}
              price={pkg.price}
              size={pkg.size}
              onAccept={handleAcceptPackage}
            />
          ))
        ) : (
          <div className="p-4 bg-neutral-100 rounded-lg text-center">
            <p className="text-neutral-500 mb-2">Nessun pacco disponibile</p>
            <p className="text-sm text-neutral-500">
              Ti avviseremo quando nuovi pacchi corrisponderanno al tuo viaggio
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
