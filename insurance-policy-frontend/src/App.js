// ============================================
// FILE: insurance-policy-frontend/src/App.js
// ✅ FIXED: Restored React Router Configuration
// ============================================
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
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
  // Don't show Navbar on Home, Login, or Register pages
  const hideNavbarRoutes = ['/', '/login', '/register'];
  const showNavbar = !hideNavbarRoutes.includes(location.pathname);

  return (
    <div className="app-container">
      {showNavbar && <Navbar />}
      <main className={showNavbar ? 'main-content' : ''}>
        {children}
      </main>
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