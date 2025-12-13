type LoadingPulseProps = {
  className?: string
  lines?: number
}

const LoadingPulse = ({ className = '', lines = 3 }: LoadingPulseProps) => {
  return (
    <div className={`flex flex-col gap-2 w-full items-center ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="w-full bg-current rounded-full animate-pulse"
          style={{
            height: '8px',
            opacity: 1 - i * 0.15,
            animationDelay: `${i * 0.15}s`,
            width: `${100 - i * 15}%` // Tapering width effect
          }}
        />
      ))}
    </div>
  )
}

export default LoadingPulse
