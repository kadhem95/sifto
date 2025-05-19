import { ReactNode } from "react";
import BottomNavigation from "./bottom-navigation";
import { useAuth } from "@/hooks/use-auth";

interface AppLayoutProps {
  children: ReactNode;
  hideNavigation?: boolean;
}

export default function AppLayout({ children, hideNavigation = false }: AppLayoutProps) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="app-container bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container bg-white min-h-screen max-w-lg mx-auto shadow-lg relative">
      <div className="main-content pb-20">{children}</div>
      {!hideNavigation && <BottomNavigation />}
    </div>
  );
}
