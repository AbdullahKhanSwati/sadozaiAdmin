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

// Munchies (Loyverse-style) admin
import { MunchiesProvider } from './store/MunchiesStore.jsx';
import MunchiesLayout from './components/MunchiesLayout.jsx';
import SalesSummary from './pages/munchies/SalesSummary.jsx';
import SalesByItem from './pages/munchies/SalesByItem.jsx';
import SalesByCategory from './pages/munchies/SalesByCategory.jsx';
import SalesByEmployee from './pages/munchies/SalesByEmployee.jsx';
import MunchiesReceipts from './pages/munchies/Receipts.jsx';
import SalesByModifier from './pages/munchies/SalesByModifier.jsx';
import MunchiesDiscounts from './pages/munchies/Discounts.jsx';
import MunchiesSettings from './pages/munchies/Settings.jsx';
import ComingSoon from './pages/munchies/ComingSoon.jsx';
import ItemList from './pages/munchies/ItemList.jsx';
import ItemForm from './pages/munchies/ItemForm.jsx';
import Categories from './pages/munchies/Categories.jsx';
import CategoryForm from './pages/munchies/CategoryForm.jsx';
import ModifiersPage from './pages/munchies/Modifiers.jsx';
import ModifierForm from './pages/munchies/ModifierForm.jsx';
import ItemDiscounts from './pages/munchies/ItemDiscounts.jsx';
import DiscountForm from './pages/munchies/DiscountForm.jsx';
import EmployeeList from './pages/munchies/EmployeeList.jsx';
import EmployeeForm from './pages/munchies/EmployeeForm.jsx';
import AccessRights from './pages/munchies/AccessRights.jsx';
import RoleForm from './pages/munchies/RoleForm.jsx';
import CustomerList from './pages/munchies/CustomerList.jsx';
import CustomerForm from './pages/munchies/CustomerForm.jsx';
import Account from './pages/munchies/Account.jsx';

function RequireAuth({ children }) {
  const { session, loading } = useAuth();
  if (loading) return null; // wait for the async session refresh before deciding
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

// Land the user on the right admin after login based on their business.
function HomeRedirect() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (session.businessId === 'munchies') return <Navigate to="/munchies" replace />;
  return <Navigate to="/admin/dashboard" replace />;
}

function Shell() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomeRedirect />} />

      {/* Shots admin */}
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

      {/* Munchies admin */}
      <Route
        path="/munchies"
        element={
          <RequireAuth>
            <MunchiesProvider>
              <MunchiesLayout />
            </MunchiesProvider>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="reports/sales-summary" replace />} />
        <Route path="reports" element={<Navigate to="sales-summary" replace />} />
        <Route path="reports/sales-summary" element={<SalesSummary />} />
        <Route path="reports/sales-by-item" element={<SalesByItem />} />
        <Route path="reports/sales-by-category" element={<SalesByCategory />} />
        <Route path="reports/sales-by-employee" element={<SalesByEmployee />} />
        <Route path="reports/receipts" element={<MunchiesReceipts />} />
        <Route path="reports/sales-by-modifier" element={<SalesByModifier />} />
        <Route path="reports/discounts" element={<MunchiesDiscounts />} />
        <Route path="reports/taxes" element={<ComingSoon title="Taxes" />} />

        {/* Items */}
        <Route path="items" element={<Navigate to="list" replace />} />
        <Route path="items/list" element={<ItemList />} />
        <Route path="items/new" element={<ItemForm />} />
        <Route path="items/categories" element={<Categories />} />
        <Route path="items/categories/new" element={<CategoryForm />} />
        <Route path="items/categories/:id" element={<CategoryForm />} />
        <Route path="items/modifiers" element={<ModifiersPage />} />
        <Route path="items/modifiers/new" element={<ModifierForm />} />
        <Route path="items/modifiers/:id" element={<ModifierForm />} />
        <Route path="items/discounts" element={<ItemDiscounts />} />
        <Route path="items/discounts/new" element={<DiscountForm />} />
        <Route path="items/discounts/:id" element={<DiscountForm />} />
        <Route path="items/:id" element={<ItemForm />} />

        {/* Employees */}
        <Route path="employees" element={<Navigate to="list" replace />} />
        <Route path="employees/list" element={<EmployeeList />} />
        <Route path="employees/new" element={<EmployeeForm />} />
        <Route path="employees/access" element={<AccessRights />} />
        <Route path="employees/access/new" element={<RoleForm />} />
        <Route path="employees/access/:id" element={<RoleForm />} />
        <Route path="employees/:id" element={<EmployeeForm />} />

        {/* Account (from the profile menu) */}
        <Route path="account" element={<Account />} />

        {/* Customers */}
        <Route path="customers" element={<CustomerList />} />
        <Route path="customers/new" element={<CustomerForm />} />
        <Route path="customers/:id" element={<CustomerForm />} />

        <Route path="settings" element={<MunchiesSettings />} />
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
