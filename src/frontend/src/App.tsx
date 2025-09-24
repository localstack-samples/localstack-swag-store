import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ProductPage from './pages/ProductPage'
import CheckoutPage from './pages/CheckoutPage'
import ConfirmationPage from './pages/ConfirmationPage'
import AdminPage from './pages/AdminPage'
import { CartProvider } from './context/CartContext'
import Navbar from './components/Navbar'

function App() {
  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/product/:productId" element={<ProductPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/:productId" element={<CheckoutPage />} />
            <Route path="/order/:orderId" element={<ConfirmationPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </div>
      </div>
    </CartProvider>
  )
}

export default App
