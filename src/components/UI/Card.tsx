import type { ReactNode } from 'react'
import clsx from 'clsx'

type CardProps = {
  children: ReactNode
  className?: string
}

const Card = ({ children, className }: CardProps) => {
  return (
    <div
      className={clsx(
        'rounded-3xl overflow-hidden bg-white/8 backdrop-blur-lg p-[4%] border border-white/15 shadow-2xl shadow-black/30',
        className,
      )}
    >
      {children}
    </div>
  )
}

export default Card

