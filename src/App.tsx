import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import Footer from './components/Layout/Footer';
import MobileNav from './components/Layout/MobileNav';

// Pages
import Dashboard from './pages/Dashboard';
import Passengers from './pages/Passengers';
import Conductors from './pages/Conductors';
import Reports from './pages/Reports';
import ScanQR from './pages/ScanQR';
import Users from './pages/Users';
import Signatures from './pages/Signatures';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-full sm:max-w-lg lg:max-w-2xl xl:max-w-3xl mx-auto">
              {children}
            </div>
          </main>
          <Footer />
          <MobileNav />
        </div>
      </div>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to={user?.role === 'conductor' ? '/scan-qr' : '/dashboard'} replace /> : <LoginForm />} 
      />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to={user?.role === 'conductor' ? '/scan-qr' : '/dashboard'} replace />
          </ProtectedRoute>
        }
      />
      
      {/* Admin/Root Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              {user?.role !== 'conductor' ? <Dashboard /> : <Navigate to="/scan-qr" replace />}
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/passengers"
        element={
          <ProtectedRoute>
            <AppLayout>
              {user?.role !== 'conductor' ? <Passengers /> : <Navigate to="/scan-qr" replace />}
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/conductors"
        element={
          <ProtectedRoute>
            <AppLayout>
              {user?.role !== 'conductor' ? <Conductors /> : <Navigate to="/scan-qr" replace />}
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Reports />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <AppLayout>
              {user?.role === 'root' ? <Users /> : <Navigate to="/dashboard" replace />}
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/signatures"
        element={
          <ProtectedRoute>
            <AppLayout>
              {user?.role !== 'conductor' ? <Signatures /> : <Navigate to="/scan-qr" replace />}
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/scan-qr"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ScanQR />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/my-trips"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Reports />
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;