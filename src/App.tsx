import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RequireOrganization } from "@/components/auth/RequireOrganization";
import { DashboardRedirect } from "@/components/auth/DashboardRedirect";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import MemberDashboard from "./pages/MemberDashboard";
import Organization from "./pages/Organization";
import Integrations from "./pages/Integrations";
import BoardConfig from "./pages/BoardConfig";
import OAuthCallback from "./pages/OAuthCallback";
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
                    <DashboardRedirect />
                  </RequireOrganization>
                </ProtectedRoute>
              }
            />
            <Route
              path="/member"
              element={
                <ProtectedRoute>
                  <RequireOrganization>
                    <AppLayout pageTitle="My Tasks">
                      <MemberDashboard />
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
            <Route
              path="/boards"
              element={
                <ProtectedRoute>
                  <RequireOrganization>
                    <AppLayout pageTitle="Board Configuration">
                      <BoardConfig />
                    </AppLayout>
                  </RequireOrganization>
                </ProtectedRoute>
              }
            />
            <Route path="/oauth-callback" element={<OAuthCallback />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
