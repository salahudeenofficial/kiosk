import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useKioskStore } from '../store/kioskStore'

const useAutoNavigate = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const userImage = useKioskStore((state) => state.userImage)
  const validated = useKioskStore((state) => state.validated)
  const userGender = useKioskStore((state) => state.userGender)

  useEffect(() => {
    const path = location.pathname

    // Don't auto-navigate if we're on the idle screen
    if (path === '/') {
      return
    }

    // If no gender is set, redirect to IdleScreen to collect details
    if (!userGender && path !== '/') {
      navigate('/', { replace: true })
      return
    }

    if (!userImage && path !== '/' && path !== '/capture') {
      navigate('/capture', { replace: true })
      return
    }

    if (userImage && !validated && path !== '/validate' && path !== '/capture') {
      navigate('/validate', { replace: true })
    }
  }, [location.pathname, navigate, userImage, validated, userGender])
}

export default useAutoNavigate

