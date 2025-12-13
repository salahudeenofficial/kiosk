import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'
import clsx from 'clsx'

type Props = HTMLMotionProps<'div'> & {
  children: ReactNode
}

const MotionFade = ({ children, className, ...rest }: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={clsx(className)}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export default MotionFade

