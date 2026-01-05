// ============================================
// FILE: insurance-policy-frontend/src/App.js
// ✅ FIXED: Added missing routes for Help, Contact, & Privacy
// ============================================
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Loader from './components/common/Loader';

// Pages
import Home from './pages/Home';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './pages/Dashboard';
import Policies from './pages/Policies';
import AdminPanel from './pages/AdminPanel';
import Subscription from './pages/Subscription';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

// ✅ IMPORT MISSING PAGES
import ContactUs from './pages/ContactUs';
import HelpCenter from './pages/HelpCenter';
import PrivacyPolicy from './pages/PrivacyPolicy';

// Protected Route Wrapper
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return user ? children : <Navigate to="/login" />;
};

// Admin Route Wrapper
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return user && (user.role === 'admin' || user.role === 'super-admin') 
    ? children 
    : <Navigate to="/dashboard" />;
};

// Layout Component (Hides Navbar on Public Pages)
const Layout = ({ children }) => {
  const location = useLocation();
  // Don't show Navbar on Home, Login, or Register
  const hideNavbarRoutes = ['/', '/login', '/register'];
  const showNavbar = !hideNavbarRoutes.includes(location.pathname);

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {showNavbar && <Navbar />}
      
      <main className={showNavbar ? 'main-content' : ''} style={{ flex: 1 }}>
        {children}
      </main>

      {/* Footer shows on all pages */}
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* ✅ NEW PUBLIC ROUTES (Fixes 404 Errors) */}
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <PrivateRoute><Dashboard /></PrivateRoute>
            } />
            <Route path="/policies" element={
              <PrivateRoute><Policies /></PrivateRoute>
            } />
            <Route path="/subscription" element={
              <PrivateRoute><Subscription /></PrivateRoute>
            } />
            <Route path="/profile" element={
              <PrivateRoute><Profile /></PrivateRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <AdminRoute><AdminPanel /></AdminRoute>
            } />
            
            {/* 404 Page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
};

export default App;