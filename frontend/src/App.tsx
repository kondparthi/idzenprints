import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/auth/ProtectedRoute";
import AppLayout from "@/layouts/AppLayout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import MemberLogin from "@/pages/MemberLogin";
import Shop from "@/pages/Shop";
import ProductPage from "@/pages/ProductPage";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import OrderConfirmation from "@/pages/OrderConfirmation";
import CartDrawer from "@/storefront/CartDrawer";
import MemberProtectedRoute from "@/auth/MemberProtectedRoute";
import MemberLayout from "@/layouts/MemberLayout";
import MemberDashboard from "@/pages/MemberDashboard";
import MemberSubscription from "@/pages/MemberSubscription";
import MemberProfile from "@/pages/MemberProfile";
import MemberSectionPlaceholder from "@/pages/MemberSectionPlaceholder";
import MemberAadhaarPvc from "@/pages/MemberAadhaarPvc";
import MemberCreditHistory from "@/pages/MemberCreditHistory";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import Members from "@/pages/Members";
import CustomerForm from "@/pages/CustomerForm";
import DocumentUpload from "@/pages/DocumentUpload";
import DocumentDetail from "@/pages/DocumentDetail";
import CardTypes from "@/pages/CardTypes";
import Templates from "@/pages/Templates";
import TemplateDesigner from "@/pages/TemplateDesigner";
import CardGenerate from "@/pages/CardGenerate";
import Orders from "@/pages/Orders";
import Reports from "@/pages/Reports";
import Profile from "@/pages/Profile";
import ChangePassword from "@/pages/ChangePassword";
import Products from "@/pages/Products";
import ProductForm from "@/pages/ProductForm";
import ProductCategories from "@/pages/ProductCategories";
import Brands from "@/pages/Brands";
import MemberTypes from "@/pages/MemberTypes";
import Packages from "@/pages/Packages";
import PackageForm from "@/pages/PackageForm";
import Subscriptions from "@/pages/Subscriptions";
import MemberSessions from "@/pages/MemberSessions";
import CreditLedger from "@/pages/CreditLedger";
import PrintBucket from "@/pages/PrintBucket";
import { PrintBucketProvider } from "@/print-bucket/PrintBucketContext";

export default function App() {
  return (
    <>
      <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/register" element={<Register />} />
      <Route path="/member/login" element={<MemberLogin />} />

      <Route path="/shop" element={<Shop />} />
      <Route path="/shop/:productId" element={<ProductPage />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />

      <Route element={<MemberProtectedRoute />}>
        <Route element={<MemberLayout />}>
          <Route path="/member/dashboard" element={<MemberDashboard />} />
          <Route path="/member/subscription" element={<MemberSubscription />} />
          <Route path="/member/profile" element={<MemberProfile />} />
          <Route path="/member/section/:slug" element={<MemberSectionPlaceholder />} />
          <Route path="/member/cards/aadhaar-pvc" element={<MemberAadhaarPvc />} />
          <Route path="/member/credit-history" element={<MemberCreditHistory />} />
        </Route>
      </Route>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <PrintBucketProvider>
              <AppLayout />
            </PrintBucketProvider>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/print-bucket" element={<PrintBucket />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/members" element={<Members />} />
          <Route path="/customers/new" element={<CustomerForm />} />
          <Route path="/customers/:id" element={<CustomerForm />} />
          <Route path="/documents/upload" element={<DocumentUpload />} />
          <Route path="/documents/:id" element={<DocumentDetail />} />
          <Route path="/card-types" element={<CardTypes />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/templates/:id/design" element={<TemplateDesigner />} />
          <Route path="/cards/new" element={<CardGenerate />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/:id" element={<ProductForm />} />
          <Route path="/product-categories" element={<ProductCategories />} />
          <Route path="/brands" element={<Brands />} />
          <Route path="/member-types" element={<MemberTypes />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/packages/new" element={<PackageForm />} />
          <Route path="/packages/:id" element={<PackageForm />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/members/:memberId/sessions" element={<MemberSessions />} />
          <Route path="/subscriptions/:subscriptionId/ledger" element={<CreditLedger />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
      <CartDrawer />
    </>
  );
}
