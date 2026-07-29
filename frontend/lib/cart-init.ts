import { addToCart } from '@/lib/cart-api'
import { initCartAnnouncements } from './cart-live-region'
import { onCartEvent } from './cart-events'

// Listen for cart:add events
onCartEvent('add', addToCart)

// Wire cart event lifecycle to accessibility announcements
initCartAnnouncements()
