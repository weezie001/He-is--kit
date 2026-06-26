import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Profile from "./pages/Profile";
import SizeAdvisor from "./pages/SizeAdvisor";
import Search from "./pages/Search";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Livescore from "./pages/Livescore";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminCustomers from "./pages/admin/Customers";
import AdminSupport from "./pages/admin/Support";
import Support from "./pages/Support";
import CheckoutVerify from "./pages/CheckoutVerify";
import MockPay from "./pages/MockPay";
import ResetPassword from "./pages/ResetPassword";
import LegalPage from "./pages/Legal";
import CookieConsent from "./components/CookieConsent";

// Reset scroll to the top on every route change, so a new page always opens at
// the top (not wherever the previous page was scrolled). In-page #hash anchors
// don't change wouter's pathname, so this leaves anchor jumps untouched.
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/catalog" component={Catalog} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/checkout/verify" component={CheckoutVerify} />
      <Route path="/checkout/mock-pay" component={MockPay} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={Settings} />
      <Route path="/size-advisor" component={SizeAdvisor} />
      <Route path="/search" component={Search} />
      <Route path="/chat" component={Chat} />
      <Route path="/livescore" component={Livescore} />
      <Route path="/support" component={Support} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/customers" component={AdminCustomers} />
      <Route path="/admin/support" component={AdminSupport} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Login} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/terms">{() => <LegalPage kind="terms" />}</Route>
      <Route path="/privacy">{() => <LegalPage kind="privacy" />}</Route>
      <Route path="/returns">{() => <LegalPage kind="returns" />}</Route>
      <Route path="/shipping">{() => <LegalPage kind="shipping" />}</Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <ScrollToTop />
          <Router />
          <CookieConsent />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
