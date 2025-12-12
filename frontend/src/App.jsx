import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import { PageTransition } from './components/layout/PageTransition'
import NotificationManager from './components/NotificationManager'
import { StrangerThemeManager } from './components/StrangerThemeManager'

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Schedule = lazy(() => import('./pages/Schedule'))
const Expenses = lazy(() => import('./pages/Expenses'))
const ShoppingItems = lazy(() => import('./pages/ShoppingItems'))
const DayNotes = lazy(() => import('./pages/DayNotes'))
const StockItems = lazy(() => import('./pages/StockItems'))
const GroceryPurchases = lazy(() => import('./pages/GroceryPurchases'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      <p className="mt-4 text-sm text-gray-400">Loading...</p>
    </div>
  </div>
)

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <PageLoader />
  }
  
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  const { user } = useAuth()
  const location = useLocation()
  
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route 
            path="/login" 
            element={
              <Suspense fallback={<PageLoader />}>
                {!user ? <Login /> : <Navigate to="/dashboard" />}
              </Suspense>
            } 
          />
          <Route 
            path="/register" 
            element={
              <Suspense fallback={<PageLoader />}>
                {!user ? <Register /> : <Navigate to="/dashboard" />}
              </Suspense>
            } 
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" />} />
            <Route 
              path="dashboard" 
              element={
                <PageTransition>
                  <Suspense fallback={<PageLoader />}>
                    <Dashboard />
                  </Suspense>
                </PageTransition>
              } 
            />
            <Route 
              path="schedule" 
              element={
                <PageTransition>
                  <Suspense fallback={<PageLoader />}>
                    <Schedule />
                  </Suspense>
                </PageTransition>
              } 
            />
            <Route 
              path="expenses" 
              element={
                <PageTransition>
                  <Suspense fallback={<PageLoader />}>
                    <Expenses />
                  </Suspense>
                </PageTransition>
              } 
            />
            <Route 
              path="shopping" 
              element={
                <PageTransition>
                  <Suspense fallback={<PageLoader />}>
                    <ShoppingItems />
                  </Suspense>
                </PageTransition>
              } 
            />
            <Route 
              path="notes" 
              element={
                <PageTransition>
                  <Suspense fallback={<PageLoader />}>
                    <DayNotes />
                  </Suspense>
                </PageTransition>
              } 
            />
            <Route 
              path="stock" 
              element={
                <PageTransition>
                  <Suspense fallback={<PageLoader />}>
                    <StockItems />
                  </Suspense>
                </PageTransition>
              } 
            />
            <Route 
              path="grocery" 
              element={
                <PageTransition>
                  <Suspense fallback={<PageLoader />}>
                    <GroceryPurchases />
                  </Suspense>
                </PageTransition>
              } 
            />
            <Route 
              path="admin" 
              element={
                <PageTransition>
                  <Suspense fallback={<PageLoader />}>
                    <AdminPanel />
                  </Suspense>
                </PageTransition>
              } 
            />
          </Route>
        </Routes>
      </AnimatePresence>
    </Suspense>
  )
}

function App() {
  return (
    <ThemeProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <StrangerThemeManager />
          <NotificationManager />
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  )
}

export default App

