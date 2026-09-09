import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Leads from "./pages/Leads";
import Customers from "./pages/Customers";
import CustomerPortal from "./pages/CustomerPortal";
import AgentWorkspaceGate from "./components/AgentWorkspaceGate";
import AiChatWindow from "@/components/AiChatWindow";
import { AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

function Router() {
  const { role, isAgent } = useAuth();

  return (
    <Switch>
      {/* Root Route: Agent Dashboard if role === 'agent', else Customer Portal */}
      <Route path="/">
        {isAgent ? <Home /> : <CustomerPortal />}
      </Route>

      {/* Properties Route */}
      <Route path="/properties">
        {isAgent ? <Home /> : <CustomerPortal />}
      </Route>

      {/* Dedicated Customer Portal Routes */}
      <Route path="/customer" component={CustomerPortal} />
      <Route path="/customer/shortlist" component={CustomerPortal} />
      <Route path="/customer/viewings" component={CustomerPortal} />
      <Route path="/customer/financing" component={CustomerPortal} />

      {/* Dedicated Agent Portal Routes */}
      <Route path="/agent">
        {isAgent ? <Home /> : <AgentWorkspaceGate featureName="Agent Executive Suite" />}
      </Route>

      {/* Agent Only Routes - Protected with AgentWorkspaceGate for Guest & Customer */}
      <Route path="/leads">
        {isAgent ? <Leads /> : <AgentWorkspaceGate featureName="Leads Pipeline" />}
      </Route>

      <Route path="/customers">
        {isAgent ? <Customers /> : <AgentWorkspaceGate featureName="Client CRM" />}
      </Route>

      <Route path="/analytics">
        {isAgent ? <Home /> : <AgentWorkspaceGate featureName="Executive Analytics" />}
      </Route>

      <Route path="/ai">
        {isAgent ? <Home /> : <AgentWorkspaceGate featureName="AI Sales Copilot" />}
      </Route>

      <Route path="/404" component={NotFound} />
      {/* Fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AiChatOverlay() {
  const { isAgent } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggleAiChat', handleToggle);
    return () => window.removeEventListener('toggleAiChat', handleToggle);
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("assistant") === "open") {
      setIsOpen(true);
    }
  }, []);

  // Only open agent AI chat overlay for agent workspace
  if (!isAgent) return null;

  return (
    <AnimatePresence>
      {isOpen && <AiChatWindow onClose={() => setIsOpen(false)} />}
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <Router />
            <AiChatOverlay />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
