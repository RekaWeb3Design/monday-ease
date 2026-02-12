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
import Clients from "./pages/Clients";
import ClientDashboard from "./pages/ClientDashboard";
import Integrations from "./pages/Integrations";
import BoardConfig from "./pages/BoardConfig";
import Templates from "./pages/Templates";
import ExecutionHistory from "./pages/ExecutionHistory";
import OAuthCallback from "./pages/OAuthCallback";
import BoardViews from "./pages/BoardViews";
import CustomViewPage from "./pages/CustomViewPage";
import Settings from "./pages/Settings";
import DemoDashboard from "./pages/DemoDashboard";
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
              path="/clients"
              element={
                <ProtectedRoute>
                  <RequireOrganization>
                    <AppLayout pageTitle="Clients">
                      <Clients />
                    </AppLayout>
                  </RequireOrganization>
                </ProtectedRoute>
              }
            />
            {/* Public client dashboard - no auth required */}
            <Route path="/c/:slug" element={<ClientDashboard />} />
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
            <Route
              path="/templates"
              element={
                <ProtectedRoute>
                  <RequireOrganization>
                    <AppLayout pageTitle="Templates">
                      <Templates />
                    </AppLayout>
                  </RequireOrganization>
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <RequireOrganization>
                    <AppLayout pageTitle="Activity">
                      <ExecutionHistory />
                    </AppLayout>
                  </RequireOrganization>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <RequireOrganization>
                    <AppLayout pageTitle="Settings">
                      <Settings />
                    </AppLayout>
                  </RequireOrganization>
                </ProtectedRoute>
              }
            />
            <Route
              path="/board-views"
              element={
                <ProtectedRoute>
                  <RequireOrganization>
                    <AppLayout pageTitle="Board Views">
                      <BoardViews />
                    </AppLayout>
                  </RequireOrganization>
                </ProtectedRoute>
              }
            />
            <Route
              path="/board-views/:slug"
              element={
                <ProtectedRoute>
                  <RequireOrganization>
                    <AppLayout pageTitle="Custom View">
                      <CustomViewPage />
                    </AppLayout>
                  </RequireOrganization>
                </ProtectedRoute>
              }
            />
            <Route
              path="/demo-dashboard"
              element={
                <ProtectedRoute>
                  <RequireOrganization>
                    <AppLayout pageTitle="Demo Dashboard">
                      <DemoDashboard />
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
