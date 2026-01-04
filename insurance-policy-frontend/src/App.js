// ============================================
// FILE: insurance-policy-frontend/src/App.js
// ============================================

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ScrollToTop from './components/common/ScrollToTop'; // ✅ 1. Import Here
import Loader from './components/common/Loader';

// Pages
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Policies from './pages/Policies';
import Subscription from './pages/Subscription';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import HelpCenter from './pages/HelpCenter';
import ContactUs from './pages/ContactUs';
import PrivacyPolicy from './pages/PrivacyPolicy';

// ... (Keep your ProtectedRoute, AdminRoute, and PublicRoute components exactly as they were) ...
const ProtectedRoute = ({ children }) => { /* ... code ... */ const { user, loading } = useAuth(); if (loading) return <Loader />; if (!user) return <Navigate to="/login" replace />; return children; };
const PublicRoute = ({ children }) => { /* ... code ... */ const { user, loading } = useAuth(); if (loading) return <Loader />; if (user && (window.location.pathname === '/login' || window.location.pathname === '/register')) return <Navigate to="/dashboard" replace />; return children; };
const AdminRoute = ({ children }) => { /* ... code ... */ const { user, loading } = useAuth(); if (loading) return <Loader />; if (!user || (user.role !== 'admin' && user.role !== 'super-admin')) return <Navigate to="/dashboard" replace />; return children; };

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {user && <Navbar />}
      
      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/policies" element={<ProtectedRoute><Policies /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          
          <Route path="/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
          <Route path="/contact" element={<ProtectedRoute><ContactUs /></ProtectedRoute>} />
          <Route path="/privacy" element={<ProtectedRoute><PrivacyPolicy /></ProtectedRoute>} />

          <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      {/* ✅ 2. Add ScrollToTop here, immediately inside Router */}
      <ScrollToTop />
      
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;