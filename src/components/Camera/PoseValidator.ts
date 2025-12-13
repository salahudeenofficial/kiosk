class PoseValidator {
    private stableSince: number | null = null
    private readonly stableMs: number

    constructor(stableMs = 1500) {
        this.stableMs = stableMs
    }

    updatePose(isPresent: boolean) {
        const now = performance.now()
        if (!isPresent) {
            this.stableSince = null
            return { stable: false, progress: 0 }
        }

        if (!this.stableSince) {
            this.stableSince = now
        }

        const elapsed = now - this.stableSince
        const progress = Math.min(1, elapsed / this.stableMs)
        return { stable: elapsed >= this.stableMs, progress }
    }

    reset() {
        this.stableSince = null
    }
}

export default PoseValidator
