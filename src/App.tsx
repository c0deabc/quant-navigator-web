import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "@/pages/Auth";
import Pending from "@/pages/Pending";
import Disabled from "@/pages/Disabled";
import Dashboard from "@/pages/Dashboard";
import SignalDetail from "@/pages/SignalDetail";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import FundingMonitor from "@/pages/FundingMonitor";
import FundingSymbolDetail from "@/pages/FundingSymbolDetail";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import UserManagement from "@/pages/admin/UserManagement";
import ScanConfig from "@/pages/admin/ScanConfig";
import DataManagement from "@/pages/admin/DataManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/pending" element={<Pending />} />
              <Route path="/disabled" element={<Disabled />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/signal/:id" element={<ProtectedRoute><SignalDetail /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/funding" element={<ProtectedRoute><FundingMonitor /></ProtectedRoute>} />
              <Route path="/funding/:symbol" element={<ProtectedRoute><FundingSymbolDetail /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requireAdmin><UserManagement /></ProtectedRoute>} />
              <Route path="/admin/scan-config" element={<ProtectedRoute requireAdmin><ScanConfig /></ProtectedRoute>} />
              <Route path="/admin/data" element={<ProtectedRoute requireAdmin><DataManagement /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
