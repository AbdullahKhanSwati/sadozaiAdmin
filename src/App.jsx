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
import MunchiesStock from './pages/munchies/Stock.jsx';
import MunchiesExpenses from './pages/munchies/Expenses.jsx';

// Block Factory admin — same shape as Munchies, plus customer receivables.
import { BlockFactoryProvider } from './store/BlockFactoryStore.jsx';
import BlockFactoryLayout from './components/BlockFactoryLayout.jsx';
import BfSalesSummary from './pages/blockFactory/SalesSummary.jsx';
import BfSalesByItem from './pages/blockFactory/SalesByItem.jsx';
import BfSalesByCategory from './pages/blockFactory/SalesByCategory.jsx';
import BfSalesByEmployee from './pages/blockFactory/SalesByEmployee.jsx';
import BfReceipts from './pages/blockFactory/Receipts.jsx';
import BfSalesByModifier from './pages/blockFactory/SalesByModifier.jsx';
import BfDiscounts from './pages/blockFactory/Discounts.jsx';
import BfSettings from './pages/blockFactory/Settings.jsx';
import BfComingSoon from './pages/blockFactory/ComingSoon.jsx';
import BfItemList from './pages/blockFactory/ItemList.jsx';
import BfItemForm from './pages/blockFactory/ItemForm.jsx';
import BfCategories from './pages/blockFactory/Categories.jsx';
import BfCategoryForm from './pages/blockFactory/CategoryForm.jsx';
import BfModifiers from './pages/blockFactory/Modifiers.jsx';
import BfModifierForm from './pages/blockFactory/ModifierForm.jsx';
import BfItemDiscounts from './pages/blockFactory/ItemDiscounts.jsx';
import BfDiscountForm from './pages/blockFactory/DiscountForm.jsx';
import BfEmployeeList from './pages/blockFactory/EmployeeList.jsx';
import BfEmployeeForm from './pages/blockFactory/EmployeeForm.jsx';
import BfAccessRights from './pages/blockFactory/AccessRights.jsx';
import BfRoleForm from './pages/blockFactory/RoleForm.jsx';
import BfCustomerList from './pages/blockFactory/CustomerList.jsx';
import BfCustomerForm from './pages/blockFactory/CustomerForm.jsx';
import BfCustomerStatement from './pages/blockFactory/CustomerStatement.jsx';
import BfReceivables from './pages/blockFactory/Receivables.jsx';
import BfAccount from './pages/blockFactory/Account.jsx';
import BfStock from './pages/blockFactory/Stock.jsx';
import BfExpenses from './pages/blockFactory/Expenses.jsx';

function RequireAuth({ children }) {
  const { session, loading } = useAuth();
  if (loading) return null; // wait for the async session refresh before deciding
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

// Keep signed-in users out of the login page — if a persisted session exists,
// send them straight to their dashboard instead of showing the form again.
function RedirectIfAuthed({ children }) {
  const { session, loading } = useAuth();
  if (loading) return null; // wait for the async session refresh before deciding
  if (session) return <Navigate to="/" replace />;
  return children;
}

// Land the user on the right admin after login based on their business.
function HomeRedirect() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (session.businessId === 'munchies') return <Navigate to="/munchies" replace />;
  if (session.businessId === 'sadozai') return <Navigate to="/block-factory" replace />;
  return <Navigate to="/admin/dashboard" replace />;
}

function Shell() {
  return (
    <Routes>
      <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
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
        {/* The page is now just "Summary" — keep the old path working as well. */}
        <Route path="reports/summary" element={<SalesSummary />} />
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

        <Route path="expenses" element={<MunchiesExpenses />} />
        <Route path="stock" element={<MunchiesStock />} />
        <Route path="settings" element={<MunchiesSettings />} />
      </Route>

      {/* Block Factory admin */}
      <Route
        path="/block-factory"
        element={
          <RequireAuth>
            <BlockFactoryProvider>
              <BlockFactoryLayout />
            </BlockFactoryProvider>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="reports/sales-summary" replace />} />
        <Route path="reports" element={<Navigate to="sales-summary" replace />} />
        <Route path="reports/sales-summary" element={<BfSalesSummary />} />
        <Route path="reports/summary" element={<BfSalesSummary />} />
        <Route path="reports/sales-by-item" element={<BfSalesByItem />} />
        <Route path="reports/sales-by-category" element={<BfSalesByCategory />} />
        <Route path="reports/sales-by-employee" element={<BfSalesByEmployee />} />
        <Route path="reports/receipts" element={<BfReceipts />} />
        <Route path="reports/sales-by-modifier" element={<BfSalesByModifier />} />
        <Route path="reports/discounts" element={<BfDiscounts />} />
        <Route path="reports/receivables" element={<BfReceivables />} />
        <Route path="reports/taxes" element={<BfComingSoon title="Taxes" />} />

        {/* Items */}
        <Route path="items" element={<Navigate to="list" replace />} />
        <Route path="items/list" element={<BfItemList />} />
        <Route path="items/new" element={<BfItemForm />} />
        <Route path="items/categories" element={<BfCategories />} />
        <Route path="items/categories/new" element={<BfCategoryForm />} />
        <Route path="items/categories/:id" element={<BfCategoryForm />} />
        <Route path="items/modifiers" element={<BfModifiers />} />
        <Route path="items/modifiers/new" element={<BfModifierForm />} />
        <Route path="items/modifiers/:id" element={<BfModifierForm />} />
        <Route path="items/discounts" element={<BfItemDiscounts />} />
        <Route path="items/discounts/new" element={<BfDiscountForm />} />
        <Route path="items/discounts/:id" element={<BfDiscountForm />} />
        <Route path="items/:id" element={<BfItemForm />} />

        {/* Employees */}
        <Route path="employees" element={<Navigate to="list" replace />} />
        <Route path="employees/list" element={<BfEmployeeList />} />
        <Route path="employees/new" element={<BfEmployeeForm />} />
        <Route path="employees/access" element={<BfAccessRights />} />
        <Route path="employees/access/new" element={<BfRoleForm />} />
        <Route path="employees/access/:id" element={<BfRoleForm />} />
        <Route path="employees/:id" element={<BfEmployeeForm />} />

        <Route path="account" element={<BfAccount />} />

        {/* Customers — statement carries the receivables ledger */}
        <Route path="customers" element={<BfCustomerList />} />
        <Route path="customers/new" element={<BfCustomerForm />} />
        <Route path="customers/:id/statement" element={<BfCustomerStatement />} />
        <Route path="customers/:id" element={<BfCustomerForm />} />

        <Route path="expenses" element={<BfExpenses />} />
        <Route path="stock" element={<BfStock />} />
        <Route path="settings" element={<BfSettings />} />
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
