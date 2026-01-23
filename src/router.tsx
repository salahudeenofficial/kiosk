import { Navigate, createBrowserRouter } from 'react-router-dom'
import AppLayout from './App'
import ConfigScreen from './pages/ConfigScreen'
import CaptureScreen from './pages/CaptureScreen'
import NewIdleScreen from './pages/NewIdleScreen'
import UserDetailsScreen from './pages/UserDetailsScreen'
import ProductDetail from './pages/ProductDetail'
import ProductList from './pages/ProductList'
import PurchaseScreen from './pages/PurchaseScreen'
import ReviewScreen from './pages/ReviewScreen'
import SessionEnd from './pages/SessionEnd'
import TryOnScreen from './pages/TryOnScreen'
import TryOnResultsScreen from './pages/TryOnResultsScreen'
import ValidationScreen from './pages/ValidationScreen'
import FitCheckScreen from './pages/FitCheckScreen'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <NewIdleScreen /> },
      { path: 'config', element: <ConfigScreen /> },
      { path: 'user-details', element: <UserDetailsScreen /> },
      { path: 'capture', element: <CaptureScreen /> },
      { path: 'validate', element: <ValidationScreen /> },
      { path: 'products', element: <ProductList /> },
      { path: 'product/:id', element: <ProductDetail /> },
      { path: 'fit-check', element: <FitCheckScreen /> },
      { path: 'tryon', element: <TryOnScreen /> },
      { path: 'tryon-results', element: <TryOnResultsScreen /> },
      { path: 'review', element: <ReviewScreen /> },
      { path: 'purchase', element: <PurchaseScreen /> },
      { path: 'session-end', element: <SessionEnd /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
], {
  // Ensure we always start at the root on page reload
  basename: '/',
})

export default router

