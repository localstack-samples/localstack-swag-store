import { useEffect } from 'react'
import { getProducts } from '../lib/api'

function HomePage() {
  useEffect(() => {
    getProducts()
      .then((products) => {
        console.log('Products:', products)
      })
      .catch((err) => {
        console.error('Failed to fetch products:', err)
      })
  }, [])

  return <div>Home Page</div>
}

export default HomePage


