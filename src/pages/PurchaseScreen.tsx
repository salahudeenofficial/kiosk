import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/UI/Button'
import Card from '../components/UI/Card'
import MotionFade from '../components/UI/MotionFade'
import useAutoNavigate from '../hooks/useAutoNavigate'
import { useKioskStore } from '../store/kioskStore'
import { formatPrice } from '../utils/validators'

const PurchaseScreen = () => {
  useAutoNavigate()
  const navigate = useNavigate()
  const cart = useKioskStore((state) => state.cart)
  const removeFromCart = useKioskStore((state) => state.removeFromCart)

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price, 0),
    [cart],
  )

  if (!cart.length) {
    return (
      <Card className="flex flex-col gap-[3%] items-center text-center">
        <p className="text-clamp-body text-white/70">Your cart is empty.</p>
        <Button onClick={() => navigate('/products')}>Browse looks</Button>
      </Card>
    )
  }

  return (
    <MotionFade>
      <div className="grid grid-cols-1 gap-[3%] lg:grid-cols-2">
        <Card className="flex flex-col gap-[2%]">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/60">
              Checkout
            </p>
            <h2 className="text-clamp-title font-bold">Review cart</h2>
          </div>
          <div className="flex flex-col gap-[2%]">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-[3%] rounded-2xl bg-white/5 p-[3%] border border-white/10"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-[14vh] w-[14vh] object-cover rounded-xl"
                />
                <div className="flex-1">
                  <p className="text-clamp-body font-semibold">{item.title}</p>
                  <p className="text-white/70">{formatPrice(item.price)}</p>
                </div>
                <button
                  className="text-white/60 hover:text-white text-sm"
                  onClick={() => removeFromCart(item.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-clamp-body font-semibold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </Card>

        <Card className="flex flex-col gap-[3%] justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/60">
              Payment
            </p>
            <h3 className="text-clamp-body font-semibold">Scan to pay (UPI)</h3>
          </div>
          <div className="flex flex-col items-center gap-[2%]">
            <div className="w-full max-w-xs aspect-square rounded-2xl bg-white/90 flex items-center justify-center text-slate-900 font-semibold">
              QR Placeholder
            </div>
            <p className="text-white/70 text-center">
              Use any UPI app to scan. Once paid, tap below.
            </p>
          </div>
          <Button onClick={() => navigate('/session-end')}>Payment completed</Button>
        </Card>
      </div>
    </MotionFade>
  )
}

export default PurchaseScreen

