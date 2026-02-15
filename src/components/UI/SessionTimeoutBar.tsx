
import { useLocation } from 'react-router-dom'
import useSessionTimeout from '../../hooks/useSessionTimeout'

const SessionTimeoutBar = () => {
    const { remaining, resetTimer, isWarning } = useSessionTimeout()
    const location = useLocation()

    // Only show warning on specific screens (e.g. TryOn Results) 
    // or you can make this generic. For now matching previous App logic:
    const showWarning = isWarning && location.pathname === '/tryon-results'

    if (!showWarning) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 p-[4%] flex flex-col items-center justify-center z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
            <div className="w-full max-w-2xl flex items-center justify-between gap-4">
                <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-white">Are you still there?</h3>
                    <p className="text-white/70">Session ending in {remaining}s</p>
                </div>
                <button
                    onClick={resetTimer}
                    className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors"
                >
                    Continue
                </button>
            </div>
        </div>
    )
}

export default SessionTimeoutBar
