import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/UI/Button'
import MotionFade from '../components/UI/MotionFade'
import useAutoNavigate from '../hooks/useAutoNavigate'
import { useKioskStore } from '../store/kioskStore'
import { getSuggestedSize, formatPrice } from '../utils/validators'

const ReviewScreen = () => {
  useAutoNavigate()
  const navigate = useNavigate()
  const vtonResult = useKioskStore((state) => state.vtonResult)
  const selectedProduct = useKioskStore((state) => state.selectedProduct)
  const addToCart = useKioskStore((state) => state.addToCart)

  useEffect(() => {
    if (!vtonResult || !selectedProduct) navigate('/products')
  }, [navigate, selectedProduct, vtonResult])

  const suggestedSize = useMemo(
    () => getSuggestedSize(selectedProduct?.sizes ?? []),
    [selectedProduct],
  )

  if (!vtonResult || !selectedProduct) return null

  return (
    <div className="fixed inset-0 bg-gray-100 text-slate-900 overflow-y-auto z-10">
      <MotionFade className="flex flex-col min-h-full">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-[4%] p-[4%] min-h-full">
          <div className="w-full flex flex-col">
            <img
              src={vtonResult}
              alt="Virtual try-on"
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl bg-white shadow-lg"
            />
          </div>
          <div className="flex flex-col gap-[3%] justify-between">
            <div className="flex flex-col gap-[3%]">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500 mb-[1%]">
                  Review
                </p>
                <h2 className="text-clamp-title font-bold text-slate-900">
                  {selectedProduct.title}
                </h2>
                <p className="text-clamp-body text-slate-600 mt-[2%]">
                  {selectedProduct.description}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-[4%] border border-slate-200 shadow-sm">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500 mb-[2%]">
                  Suggested size
                </p>
                <p className="text-clamp-body font-semibold text-slate-900">
                  {suggestedSize}
                </p>
              </div>
              <div className="text-clamp-title font-bold text-slate-900">
                {formatPrice(selectedProduct.price)}
              </div>
            </div>
            <div className="flex flex-col gap-[2%] mt-[4%]">
              <div className="grid grid-cols-2 gap-[3%]">
                <Button
                  className="!bg-black !text-white hover:!bg-black/90 !border-0"
                  onClick={() => {
                    addToCart(selectedProduct)
                    navigate('/purchase')
                  }}
                >
                  Add to cart
                </Button>
                <Button
                  className="!bg-white !text-slate-900 !border !border-slate-300 hover:!bg-gray-50 !shadow-none"
                  onClick={() => navigate('/products')}
                >
                  Browse more
                </Button>
              </div>
              <Button
                className="!bg-black !text-white hover:!bg-black/90 !border-0 mt-[2%]"
                onClick={() => {
                  addToCart(selectedProduct)
                  navigate('/purchase')
                }}
              >
                Proceed to purchase
              </Button>
            </div>
          </div>
        </div>
      </MotionFade>
    </div>
  )
}

export default ReviewScreen

