

interface SessionTimeoutBarProps {
    remainingSeconds: number
    onContinue: () => void
    isVisible: boolean
}

const SessionTimeoutBar = ({
    remainingSeconds,
    onContinue,
    isVisible,
}: SessionTimeoutBarProps) => {
    if (!isVisible) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 p-[4%] flex flex-col items-center justify-center z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
            <div className="w-full max-w-2xl flex items-center justify-between gap-4">
                <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-white">Are you still there?</h3>
                    <p className="text-white/70">Session ending in {remainingSeconds}s</p>
                </div>
                <button
                    onClick={onContinue}
                    className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors"
                >
                    Continue
                </button>
            </div>
        </div>
    )
}

export default SessionTimeoutBar
