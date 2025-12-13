type CaptureOverlayProps = {
  status: string
  progress?: number
  hint?: string
}

const CaptureOverlay = ({ status, progress = 0, hint }: CaptureOverlayProps) => {
  return (
    <div className="absolute inset-0 flex flex-col justify-between p-[4%] text-white pointer-events-none">
      <div className="flex items-center justify-between text-clamp-body font-semibold">
        <span>AI Fashion Kiosk</span>
        <span className="text-sm uppercase tracking-[0.2em] text-white/70">
          Auto Capture
        </span>
      </div>
      <div className="space-y-[2%]">
        <div className="h-[2vh] w-full rounded-full bg-white/10 overflow-hidden border border-white/15">
          <div
            className="h-full bg-secondary"
            style={{ width: `${Math.floor(progress * 100)}%` }}
          />
        </div>
        <div className="rounded-2xl bg-black/40 backdrop-blur p-[3%] border border-white/10">
          <p className="text-clamp-body font-semibold">{status}</p>
          {hint && <p className="text-sm text-white/70 mt-[1%]">{hint}</p>}
        </div>
      </div>
    </div>
  )
}

export { CaptureOverlay }

