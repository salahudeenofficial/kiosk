type CaptureOverlayProps = {
  status: string
  progress?: number
  hint?: string
}

const CaptureOverlay = ({ status, progress = 0, hint }: CaptureOverlayProps) => {
  return (
    <div className="w-full max-w-3xl mx-auto mt-8 text-center px-4">
      {/* Progress Bar */}
      <div className="h-6 w-full bg-gray-200 rounded-full mb-6 overflow-hidden border border-gray-300 shadow-inner">
        <div
          className="h-full bg-black transition-all duration-200 ease-out"
          style={{ width: `${Math.floor(progress * 100)}%` }}
        />
      </div>

      {/* Main Status Text */}
      <h2 className="text-5xl md:text-6xl font-black text-black uppercase tracking-tight mb-2 min-h-[2.5em] flex items-center justify-center">
        {status}
      </h2>

      {/* Hint Text */}
      {hint && (
        <p className="text-2xl md:text-3xl font-bold text-gray-500 uppercase tracking-wide">
          {hint}
        </p>
      )}
    </div>
  )
}

export { CaptureOverlay }

