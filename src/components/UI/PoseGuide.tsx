import { motion } from 'framer-motion'

const PoseGuide = () => {
    return (
        <div className="w-full h-full bg-slate-50 flex items-center justify-center relative overflow-hidden rounded-2xl border border-slate-200">
            {/* Dynamic Pulse Ring highlighting the target pose */}
            <motion.div
                className="absolute w-[80%] h-[80%] rounded-full border-2 border-slate-300"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.2, opacity: [0, 0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 1 }}
            />

            <svg
                viewBox="-50 0 300 300"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-800 w-full h-full p-4"
            >
                {/* Head */}
                <circle cx="100" cy="40" r="20" className="fill-slate-800/10" />

                {/* Body */}
                <line x1="100" y1="60" x2="100" y2="160" />

                {/* Legs - Static slightly apart (A-pose stance) */}
                <line x1="100" y1="160" x2="70" y2="280" />
                <line x1="100" y1="160" x2="130" y2="280" />

                {/* Left Arm - Animated from relaxed to A-pose */}
                <motion.path
                    initial={{ d: "M100 75 L85 170" }} // Relaxed down
                    animate={{ d: ["M100 75 L85 170", "M100 75 L40 140"] }} // To A-pose (out)
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut"
                    }}
                />

                {/* Right Arm - Animated from relaxed to A-pose */}
                <motion.path
                    initial={{ d: "M100 75 L115 170" }} // Relaxed down
                    animate={{ d: ["M100 75 L115 170", "M100 75 L160 140"] }} // To A-pose (out)
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut"
                    }}
                />
            </svg>
        </div>
    )
}

export default PoseGuide
