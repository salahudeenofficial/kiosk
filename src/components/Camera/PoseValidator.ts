class PoseValidator {
    private stableSince: number | null = null
    private readonly stableMs: number
    // Allow up to N consecutive bad frames before resetting progress
    private readonly graceBadFrames: number
    private consecutiveBadFrames = 0

    constructor(stableMs = 800, graceBadFrames = 3) {
        this.stableMs = stableMs
        this.graceBadFrames = graceBadFrames
    }

    updatePose(isPresent: boolean) {
        const now = performance.now()
        if (!isPresent) {
            this.consecutiveBadFrames++
            // Only reset if we exceed the grace period
            if (this.consecutiveBadFrames > this.graceBadFrames) {
                this.stableSince = null
                return { stable: false, progress: 0 }
            }
            // During grace period, keep progress but don't advance
            if (!this.stableSince) {
                return { stable: false, progress: 0 }
            }
            const elapsed = now - this.stableSince
            const progress = Math.min(1, elapsed / this.stableMs)
            return { stable: false, progress }
        }

        // Good frame — reset bad frame counter
        this.consecutiveBadFrames = 0

        if (!this.stableSince) {
            this.stableSince = now
        }

        const elapsed = now - this.stableSince
        const progress = Math.min(1, elapsed / this.stableMs)
        return { stable: elapsed >= this.stableMs, progress }
    }

    reset() {
        this.stableSince = null
        this.consecutiveBadFrames = 0
    }
}

export default PoseValidator
