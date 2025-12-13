import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'
import clsx from 'clsx'

type ButtonProps = HTMLMotionProps<'button'> & {
  children: ReactNode
  variant?: 'primary' | 'ghost'
}

const Button = ({ children, variant = 'primary', className, ...rest }: ButtonProps) => {
  const baseStyles =
    'w-full py-[3%] px-[6%] text-clamp-button rounded-2xl font-semibold transition-colors duration-200'
  const variants: Record<typeof variant, string> = {
    primary:
      'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-black/30 border border-white/5',
    ghost: 'bg-white/10 text-white hover:bg-white/20 border border-white/15',
  }

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      className={clsx(baseStyles, variants[variant], className)}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

export default Button

