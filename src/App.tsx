import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RequireOrganization } from "@/components/auth/RequireOrganization";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Organization from "./pages/Organization";
import Integrations from "./pages/Integrations";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RequireOrganization>
                    <AppLayout pageTitle="Dashboard">
                      <Dashboard />
                    </AppLayout>
                  </RequireOrganization>
                </ProtectedRoute>
              }
            />
            <Route
              path="/organization"
              element={
                <ProtectedRoute>
                  <RequireOrganization>
                    <AppLayout pageTitle="Organization">
                      <Organization />
                    </AppLayout>
                  </RequireOrganization>
                </ProtectedRoute>
              }
            />
            <Route
              path="/integrations"
              element={
                <ProtectedRoute>
                  <RequireOrganization>
                    <AppLayout pageTitle="Integrations">
                      <Integrations />
                    </AppLayout>
                  </RequireOrganization>
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
