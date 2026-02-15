import { useNavigate } from 'react-router-dom'
import { useKioskStore } from '../../store/kioskStore'
import { unifiedKioskApi } from '../../utils/unifiedKioskApi'

interface EndSessionButtonProps {
    className?: string
}

const EndSessionButton = ({ className = '' }: EndSessionButtonProps) => {
    const navigate = useNavigate()
    const resetSession = useKioskStore((state) => state.resetSession)

    const handleEndSession = async () => {
        try {
            await unifiedKioskApi.completeSession()
        } catch (err) {
            console.error('Failed to complete session:', err)
        }
        resetSession()
        navigate('/')
    }

    return (
        <button
            onClick={handleEndSession}
            className={`pointer-events-auto fixed top-4 right-4 z-[70] bg-white/80 hover:bg-white text-slate-500 hover:text-red-500 p-2 rounded-full shadow-lg backdrop-blur-md border border-slate-200 transition-all ${className}`}
            aria-label="End Session"
        >
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        </button>
    )
}

export default EndSessionButton
