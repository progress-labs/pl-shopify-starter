import { addToCart } from '@/lib/cart-api'
import { onCartEvent } from './cart-events'

// Listen for cart:add events
onCartEvent('add', addToCart)
