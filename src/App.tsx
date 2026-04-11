import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Lazy-loaded pages — each becomes its own chunk
const LuxuryHome = lazy(() => import("./pages/LuxuryHome"));
const NotFound = lazy(() => import("./pages/NotFound"));
const RoomsPage = lazy(() => import("./pages/Rooms"));
const RoomDetail = lazy(() => import("./pages/RoomDetail"));
const ReferralPage = lazy(() => import("./pages/Referral"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Host = lazy(() => import("./pages/Host"));
const HostDashboard = lazy(() => import("./pages/HostDashboardClean"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const InfoPage = lazy(() => import("./pages/InfoPage"));
const Sonner = lazy(() =>
  import("@/components/ui/sonner").then((module) => ({ default: module.Toaster }))
);

// Lightweight loading fallback (no framer-motion needed)
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-muted-foreground tracking-widest uppercase">Loading</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — avoid refetching on every page nav
      gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LuxuryHome />} />
              <Route path="/rooms" element={<RoomsPage />} />
              <Route path="/rooms/:id" element={<RoomDetail />} />
              <Route path="/referral" element={<ReferralPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/host" element={<Host />} />
              <Route path="/host-dashboard" element={<HostDashboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/help" element={<InfoPage />} />
              <Route path="/safety" element={<InfoPage />} />
              <Route path="/terms" element={<InfoPage />} />
              <Route path="/privacy" element={<InfoPage />} />
              <Route path="/mlm-disclosure" element={<InfoPage />} />
              <Route path="/grievance" element={<InfoPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
      <Suspense fallback={null}>
        <Sonner />
      </Suspense>
    </QueryClientProvider>
  );
};

export default App;
