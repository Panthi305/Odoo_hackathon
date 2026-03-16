import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import IMSLayout from './components/IMSLayout';
import Home from './pages/Home/Home';
import Login from './pages/Login';
import Contact from './pages/Contact/Contact';
import IMSDashboard from './pages/app/IMSDashboard';
import Products from './pages/app/Products';
import Receipts from './pages/app/Receipts';
import Deliveries from './pages/app/Deliveries';
import Transfers from './pages/app/Transfers';
import Adjustments from './pages/app/Adjustments';
import MoveHistory from './pages/app/MoveHistory';
import Settings from './pages/app/Settings';
import Profile from './pages/app/Profile';
import UserManagement from './pages/app/UserManagement';
import ReorderRules from './pages/app/ReorderRules';
import AuditLogs from './pages/app/AuditLogs';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<><Navbar /><main className="flex-grow"><Home /></main><Footer /></>} />
      <Route path="/login" element={<><Navbar /><main className="flex-grow"><Login /></main><Footer /></>} />
      <Route path="/contact" element={<><Navbar /><main className="flex-grow"><Contact /></main><Footer /></>} />

      {/* IMS App routes — protected, with sidebar layout */}
      <Route path="/app/*" element={
        <ProtectedRoute>
          <IMSLayout>
            <Routes>
              <Route path="dashboard" element={<IMSDashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="receipts" element={<Receipts />} />
              <Route path="deliveries" element={<Deliveries />} />
              <Route path="transfers" element={<Transfers />} />
              <Route path="adjustments" element={<Adjustments />} />
              <Route path="history" element={<MoveHistory />} />
              <Route path="profile" element={<Profile />} />
              <Route path="reorder-rules" element={<ReorderRules />} />
              {/* Admin-only routes */}
              <Route path="settings" element={<AdminRoute><Settings /></AdminRoute>} />
              <Route path="users" element={<AdminRoute><UserManagement /></AdminRoute>} />
              <Route path="audit-logs" element={<AdminRoute><AuditLogs /></AdminRoute>} />
              <Route path="" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </IMSLayout>
        </ProtectedRoute>
      } />

      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-50">
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
