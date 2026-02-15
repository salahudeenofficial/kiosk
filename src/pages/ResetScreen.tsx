import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKioskStore } from '../store/kioskStore'
import { clearKioskConfig, clearSession } from '../utils/config'

const ResetScreen = () => {
    const navigate = useNavigate()
    const resetAll = useKioskStore((state) => state.resetAll)

    useEffect(() => {
        const performReset = async () => {
            // 1. Clear Zustand store
            resetAll()

            // 2. Clear Kiosk Config and Session helpers
            clearKioskConfig()
            clearSession()

            // 3. Clear all browser storage
            localStorage.clear()
            sessionStorage.clear()

            // 4. Force reload to ensure all memory states are cleared
            // We use a small timeout to ensure storage is cleared
            setTimeout(() => {
                window.location.href = '/'
            }, 1000)
        }

        performReset()
    }, [resetAll, navigate])

    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Resetting Application...</h1>
                <p className="text-white/70">Clearing all configuration and cache.</p>
            </div>
        </div>
    )
}

export default ResetScreen
