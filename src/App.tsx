import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import InstallPrompt from "./components/InstallPrompt";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Conditions from "./pages/Conditions";
import Recommendations from "./pages/Recommendations";
import PlantResults from "./pages/PlantResults";
import CamScan from "./pages/CamScan";
import History from "./pages/History";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import DeleteAccount from "./pages/DeleteAccount";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/conditions" element={<Conditions />} />
            <Route path="/conditions/:id" element={<Recommendations />} />
            <Route path="/plant/:plantName" element={<PlantResults />} />
            <Route path="/camscan" element={<CamScan />} />
            <Route path="/history" element={<History />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/delete-account" element={<DeleteAccount />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        <InstallPrompt />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
