import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ProductPage from './pages/ProductPage'
import CheckoutPage from './pages/CheckoutPage'
import ConfirmationPage from './pages/ConfirmationPage'
import AdminPage from './pages/AdminPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/product/:productId" element={<ProductPage />} />
      <Route path="/checkout/:productId" element={<CheckoutPage />} />
      <Route path="/order/:orderId" element={<ConfirmationPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}

export default App
