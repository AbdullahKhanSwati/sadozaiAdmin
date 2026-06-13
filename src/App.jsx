import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ShotsProvider } from './store/ShotsStore.jsx';
import Login from './pages/Login.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import Dashboard from './pages/shots/Dashboard.jsx';
import Tables from './pages/shots/Tables.jsx';
import Bookings from './pages/shots/Bookings.jsx';
import Memberships from './pages/shots/Memberships.jsx';
import MemberDetail from './pages/shots/MemberDetail.jsx';
import Expenses from './pages/shots/Expenses.jsx';
import Staff from './pages/shots/Staff.jsx';
import Settings from './pages/shots/Settings.jsx';

function RequireAuth({ children }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function Shell() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tables" element={<Tables />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="memberships" element={<Memberships />} />
        <Route path="memberships/:id" element={<MemberDetail />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="staff" element={<Staff />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ShotsProvider>
        <Shell />
      </ShotsProvider>
    </AuthProvider>
  );
}
