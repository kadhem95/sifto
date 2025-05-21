import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import SendPackage from "@/pages/send-package-new-improved";
import ReportTrip from "@/pages/report-trip";
import TravelersList from "@/pages/travelers-list";
import PackagesList from "@/pages/packages-list";
import Chat from "@/pages/chat";
import MyShipments from "@/pages/my-shipments";
import Review from "@/pages/review";
import Profile from "@/pages/profile";
import PackageDetails from "@/pages/package-details";
import TripDetails from "@/pages/trip-details";
import EditPackage from "@/pages/edit-package";
import EditTrip from "@/pages/edit-trip";
import { AuthProvider } from "./context/auth-context";
import { useEffect } from "react";
import { auth } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

function Router() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // If user is not authenticated and not on login page, redirect to login
      if (!user && !location.startsWith("/login")) {
        setLocation("/login");
      }

      // If user is authenticated and on login page, redirect to home
      if (user && location === "/login") {
        setLocation("/");
      }
    });

    return () => unsubscribe();
  }, [location, setLocation]);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Home} />
      <Route path="/send-package" component={SendPackage} />
      <Route path="/report-trip" component={ReportTrip} />
      <Route path="/travelers" component={TravelersList} />
      <Route path="/packages" component={PackagesList} />
      <Route path="/chat/:id" component={Chat} />
      <Route path="/my-shipments" component={MyShipments} />
      <Route path="/review/:id" component={Review} />
      <Route path="/profile" component={Profile} />
      <Route path="/package-details/:id" component={PackageDetails} />
      <Route path="/trip-details/:id" component={TripDetails} />
      <Route path="/edit-package/:id" component={EditPackage} />
      <Route path="/edit-trip/:id" component={EditTrip} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
