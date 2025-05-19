import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ShipmentData {
  id: string;
  type: "package" | "trip";
  from: string;
  to: string;
  date: string;
  status: "pending" | "in_progress" | "completed";
  counterpart?: {
    id: string;
    name: string;
    photoURL?: string;
    reviewed?: boolean;
    price?: number;
    rating?: number;
  };
}

export default function MyShipments() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"packages" | "trips">("packages");
  const [shipments, setShipments] = useState<ShipmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchShipments = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      setIsLoading(true);

      try {
        const allShipments: ShipmentData[] = [];
        
        // Fetch packages
        const packagesQuery = query(
          collection(db, "packages"),
          where("userId", "==", currentUser.uid)
        );
        const packagesSnapshot = await getDocs(packagesQuery);
        
        // Convert packages to shipment format
        const packagePromises = packagesSnapshot.docs.map(async (packageDoc) => {
          const packageData = packageDoc.data();
          
          // Get match data if any
          const matchesQuery = query(
            collection(db, "matches"),
            where("packageId", "==", packageDoc.id)
          );
          const matchesSnapshot = await getDocs(matchesQuery);
          
          let counterpart;
          let status: "pending" | "in_progress" | "completed" = "pending";
          
          if (!matchesSnapshot.empty) {
            const matchData = matchesSnapshot.docs[0].data();
            status = matchData.status === "accepted" ? "in_progress" : 
                    matchData.status === "completed" ? "completed" : "pending";
            
            // Get traveler data
            const tripQuery = query(
              collection(db, "trips"),
              where("__name__", "==", matchData.tripId)
            );
            const tripSnapshot = await getDocs(tripQuery);
            
            if (!tripSnapshot.empty) {
              const tripData = tripSnapshot.docs[0].data();
              
              // Get traveler user info
              const userQuery = query(
                collection(db, "users"),
                where("uid", "==", tripData.userId)
              );
              const userSnapshot = await getDocs(userQuery);
              
              if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                
                // Check if reviewed
                const reviewsQuery = query(
                  collection(db, "reviews"),
                  where("senderId", "==", currentUser.uid),
                  where("receiverId", "==", userData.uid),
                  where("packageId", "==", packageDoc.id)
                );
                const reviewsSnapshot = await getDocs(reviewsQuery);
                
                counterpart = {
                  id: userData.uid,
                  name: userData.displayName || "Unknown",
                  photoURL: userData.photoURL,
                  reviewed: !reviewsSnapshot.empty,
                  price: packageData.price
                };
              }
            }
          }
          
          return {
            id: packageDoc.id,
            type: "package" as const,
            from: packageData.from,
            to: packageData.to,
            date: packageData.deadline,
            status,
            counterpart
          };
        });
        
        const packagesData = await Promise.all(packagePromises);
        allShipments.push(...packagesData);
        
        // Fetch trips
        const tripsQuery = query(
          collection(db, "trips"),
          where("userId", "==", currentUser.uid)
        );
        const tripsSnapshot = await getDocs(tripsQuery);
        
        // Convert trips to shipment format
        const tripPromises = tripsSnapshot.docs.map(async (tripDoc) => {
          const tripData = tripDoc.data();
          
          // Get match data if any
          const matchesQuery = query(
            collection(db, "matches"),
            where("tripId", "==", tripDoc.id)
          );
          const matchesSnapshot = await getDocs(matchesQuery);
          
          let counterpart;
          let status: "pending" | "in_progress" | "completed" = "active" === tripData.status ? "pending" : "completed";
          
          if (!matchesSnapshot.empty) {
            const matchData = matchesSnapshot.docs[0].data();
            status = matchData.status === "accepted" ? "in_progress" : 
                    matchData.status === "completed" ? "completed" : "pending";
            
            // Get package data
            const packageQuery = query(
              collection(db, "packages"),
              where("__name__", "==", matchData.packageId)
            );
            const packageSnapshot = await getDocs(packageQuery);
            
            if (!packageSnapshot.empty) {
              const packageData = packageSnapshot.docs[0].data();
              
              // Get package sender info
              const userQuery = query(
                collection(db, "users"),
                where("uid", "==", packageData.userId)
              );
              const userSnapshot = await getDocs(userQuery);
              
              if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                
                // Check if reviewed
                const reviewsQuery = query(
                  collection(db, "reviews"),
                  where("senderId", "==", currentUser.uid),
                  where("receiverId", "==", userData.uid),
                  where("tripId", "==", tripDoc.id)
                );
                const reviewsSnapshot = await getDocs(reviewsQuery);
                
                counterpart = {
                  id: userData.uid,
                  name: userData.displayName || "Unknown",
                  photoURL: userData.photoURL,
                  reviewed: !reviewsSnapshot.empty,
                  price: packageData.price
                };
              }
            }
          }
          
          return {
            id: tripDoc.id,
            type: "trip" as const,
            from: tripData.from,
            to: tripData.to,
            date: tripData.date,
            status,
            counterpart
          };
        });
        
        const tripsData = await Promise.all(tripPromises);
        allShipments.push(...tripsData);
        
        // Sort by date (most recent first)
        allShipments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setShipments(allShipments);
      } catch (error) {
        console.error("Error fetching shipments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShipments();
  }, [currentUser, navigate]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <div className="bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full text-sm font-medium">Pending</div>;
      case "in_progress":
        return <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">In progress</div>;
      case "completed":
        return <div className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-sm font-medium">Completed</div>;
      default:
        return null;
    }
  };

  const handleOpenChat = (counterpartId: string) => {
    // Navigate to the chat with counterpart
    navigate(`/chat/${counterpartId}`);
  };

  const handleLeaveReview = (shipmentId: string, counterpartId: string) => {
    // Navigate to the review page for the counterpart
    navigate(`/review/${counterpartId}?shipmentId=${shipmentId}&type=${activeTab}`);
  };

  const filteredShipments = shipments.filter((shipment) => 
    shipment.type === activeTab
  );

  const activeShipments = filteredShipments.filter((shipment) => 
    shipment.status === "pending" || shipment.status === "in_progress"
  );

  const completedShipments = filteredShipments.filter((shipment) => 
    shipment.status === "completed"
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-neutral-500">Loading your activities...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6">My Activities</h1>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "packages" | "trips")}>
          <TabsList className="flex w-full mb-4 border-b border-neutral-200 bg-transparent">
            <TabsTrigger 
              value="packages" 
              className="flex-1 py-2 px-4 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              My Packages
            </TabsTrigger>
            <TabsTrigger 
              value="trips" 
              className="flex-1 py-2 px-4 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              My Trips
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="packages" className="mt-0">
            {activeShipments.length > 0 && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-neutral-900 mb-3">Active</h2>
                
                {activeShipments.map((shipment) => (
                  <div key={shipment.id} className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-4">
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <p className="text-neutral-900 font-medium">{shipment.from} → {shipment.to}</p>
                          <p className="text-sm text-neutral-500">by {formatDate(shipment.date)}</p>
                        </div>
                        {getStatusBadge(shipment.status)}
                      </div>

                      {shipment.counterpart && (
                        <div className="flex items-center py-2 border-t border-neutral-200">
                          <div className="flex items-center">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={shipment.counterpart.photoURL} alt={shipment.counterpart.name} />
                              <AvatarFallback>{shipment.counterpart.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="ml-2">
                              <p className="text-sm text-neutral-900">Carried by {shipment.counterpart.name}</p>
                              <p className="text-xs text-neutral-500">{shipment.counterpart.price}€ offered</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleOpenChat(shipment.counterpart!.id)}
                            className="ml-auto bg-primary text-white rounded-lg px-3 py-1 text-sm font-medium h-auto"
                          >
                            Chat
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {completedShipments.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 mb-3">Completed</h2>
                
                {completedShipments.map((shipment) => (
                  <div key={shipment.id} className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-4">
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <p className="text-neutral-900 font-medium">{shipment.from} → {shipment.to}</p>
                          <p className="text-sm text-neutral-500">{formatDate(shipment.date)}</p>
                        </div>
                        {getStatusBadge(shipment.status)}
                      </div>

                      {shipment.counterpart && (
                        <div className="flex items-center py-2 border-t border-neutral-200">
                          <div className="flex items-center">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={shipment.counterpart.photoURL} alt={shipment.counterpart.name} />
                              <AvatarFallback>{shipment.counterpart.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="ml-2">
                              <p className="text-sm text-neutral-900">Carried by {shipment.counterpart.name}</p>
                              <p className="text-xs text-neutral-500">{shipment.counterpart.price}€ paid</p>
                            </div>
                          </div>
                          <div className="ml-auto">
                            {shipment.counterpart.reviewed ? (
                              <div className="text-yellow-400 flex">
                                <Rating value={shipment.counterpart.rating || 5} readOnly size="sm" />
                              </div>
                            ) : (
                              <Button
                                onClick={() => handleLeaveReview(shipment.id, shipment.counterpart!.id)}
                                className="border border-neutral-300 text-neutral-700 rounded-lg px-3 py-1 text-sm font-medium h-auto"
                              >
                                Review
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredShipments.length === 0 && (
              <div className="text-center py-8">
                <p className="text-neutral-500">You don't have any packages yet</p>
                <Button
                  onClick={() => navigate("/send-package")}
                  className="mt-4 bg-primary text-white"
                >
                  Send a Package
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="trips" className="mt-0">
            {activeShipments.length > 0 && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-neutral-900 mb-3">Active</h2>
                
                {activeShipments.map((shipment) => (
                  <div key={shipment.id} className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-4">
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <p className="text-neutral-900 font-medium">{shipment.from} → {shipment.to}</p>
                          <p className="text-sm text-neutral-500">{formatDate(shipment.date)}</p>
                        </div>
                        {getStatusBadge(shipment.status)}
                      </div>

                      {shipment.counterpart && (
                        <div className="flex items-center py-2 border-t border-neutral-200">
                          <div className="flex items-center">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={shipment.counterpart.photoURL} alt={shipment.counterpart.name} />
                              <AvatarFallback>{shipment.counterpart.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="ml-2">
                              <p className="text-sm text-neutral-900">Package from {shipment.counterpart.name}</p>
                              <p className="text-xs text-neutral-500">{shipment.counterpart.price}€ offered</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleOpenChat(shipment.counterpart!.id)}
                            className="ml-auto bg-primary text-white rounded-lg px-3 py-1 text-sm font-medium h-auto"
                          >
                            Chat
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {completedShipments.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 mb-3">Completed</h2>
                
                {completedShipments.map((shipment) => (
                  <div key={shipment.id} className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-4">
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <p className="text-neutral-900 font-medium">{shipment.from} → {shipment.to}</p>
                          <p className="text-sm text-neutral-500">{formatDate(shipment.date)}</p>
                        </div>
                        {getStatusBadge(shipment.status)}
                      </div>

                      {shipment.counterpart && (
                        <div className="flex items-center py-2 border-t border-neutral-200">
                          <div className="flex items-center">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={shipment.counterpart.photoURL} alt={shipment.counterpart.name} />
                              <AvatarFallback>{shipment.counterpart.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="ml-2">
                              <p className="text-sm text-neutral-900">Package from {shipment.counterpart.name}</p>
                              <p className="text-xs text-neutral-500">{shipment.counterpart.price}€ earned</p>
                            </div>
                          </div>
                          <div className="ml-auto">
                            {shipment.counterpart.reviewed ? (
                              <div className="text-yellow-400 flex">
                                <Rating value={shipment.counterpart.rating || 5} readOnly size="sm" />
                              </div>
                            ) : (
                              <Button
                                onClick={() => handleLeaveReview(shipment.id, shipment.counterpart!.id)}
                                className="border border-neutral-300 text-neutral-700 rounded-lg px-3 py-1 text-sm font-medium h-auto"
                              >
                                Review
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredShipments.length === 0 && (
              <div className="text-center py-8">
                <p className="text-neutral-500">You don't have any trips yet</p>
                <Button
                  onClick={() => navigate("/report-trip")}
                  className="mt-4 bg-secondary text-white"
                >
                  Report a Trip
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
