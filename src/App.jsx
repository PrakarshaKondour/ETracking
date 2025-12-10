"use client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import LoginForm from "./Components/LoginForm/LoginForm"
import RegisterForm from "./Components/RegisterForm/RegisterForm"
import DashboardLayout from "./Components/Layout/DashboardLayout"

// admin pages
import AdminDashboard from "./Components/Admin/adminDashboard"
import AdminCustomers from "./Components/Admin/customers"
import AdminOrderDetail from "./Components/Admin/orderDetail"
import AdminOrders from "./Components/Admin/orders"
import AdminVendors from "./Components/Admin/vendors"
import AdminAnalytics from "./Components/Admin/analytics"

// vendor pages
import VendorDashboard from "./Components/Vendor/vendorDashboard"
import VendorAnalytics from "./Components/Vendor/analytics"
import VendorOrders from "./Components/Vendor/orders"
import VendorProfile from "./Components/Vendor/profile"

// customer pages
import CustomerDashboard from "./Components/Customer/customerDashboard"
import CustomerOrders from "./Components/Customer/orders"
import CustomerProfile from "./Components/Customer/profile"
import CustomerOrderDetail from "./Components/Customer/orderDetail"

import Notifications from "./Components/Notifications/Notifications"

import { isAuthenticated, getUserRole } from "./utils/auth"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={isAuthenticated() ? <Navigate to={`/${getUserRole()}`} replace /> : <LoginForm />}
        />
        <Route
          path="/register"
          element={isAuthenticated() ? <Navigate to={`/${getUserRole()}`} replace /> : <RegisterForm />}
        />

        {/* ADMIN ROUTES */}
        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />   {/* ✅ add this */}
          <Route path="vendors" element={<AdminVendors />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* VENDOR ROUTES */}
        <Route path="/vendor" element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<VendorDashboard />} />
          <Route path="analytics" element={<VendorAnalytics />} />
          <Route path="orders" element={<VendorOrders />} />
          <Route path="profile" element={<VendorProfile />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* CUSTOMER ROUTES */}
        <Route path="/customer" element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="orders" element={<CustomerOrders />} />
          <Route path="orders/:id" element={<CustomerOrderDetail />} />
          <Route path="profile" element={<CustomerProfile />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
