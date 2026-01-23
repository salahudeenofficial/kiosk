import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/UI/Button'
import MotionFade from '../components/UI/MotionFade'
import LoadingPulse from '../components/UI/LoadingPulse'
import { unifiedKioskApi } from '../utils/unifiedKioskApi'
import { useKioskStore } from '../store/kioskStore'

const ConfigScreen = () => {
    const navigate = useNavigate()
    const setIsConfigured = useKioskStore((state) => state.setIsConfigured)

    const [clientId, setClientId] = useState('')
    const [clientSecret, setClientSecret] = useState('')
    const [kioskId, setKioskId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [configInfo, setConfigInfo] = useState<{
        locationName?: string
        clientName?: string
    } | null>(null)

    // Check if already configured on mount
    useEffect(() => {
        const config = unifiedKioskApi.getConfig()
        if (config) {
            setClientId(config.clientId)
            setKioskId(config.kioskId)
            setConfigInfo({
                locationName: config.locationName,
                clientName: config.clientName,
            })
            setIsConfigured(true)
        } else {
            // Restore from session storage if not configured
            // This aids in copy-paste workflows where switching apps might reload the page
            const savedClientId = sessionStorage.getItem('config_clientId')
            const savedClientSecret = sessionStorage.getItem('config_clientSecret')
            const savedKioskId = sessionStorage.getItem('config_kioskId')

            if (savedClientId) setClientId(savedClientId)
            if (savedClientSecret) setClientSecret(savedClientSecret)
            if (savedKioskId) setKioskId(savedKioskId)
        }
    }, [setIsConfigured])

    // Save defaults to session storage
    useEffect(() => {
        if (clientId) sessionStorage.setItem('config_clientId', clientId)
        if (clientSecret) sessionStorage.setItem('config_clientSecret', clientSecret)
        if (kioskId) sessionStorage.setItem('config_kioskId', kioskId)
    }, [clientId, clientSecret, kioskId])

    const handleConfigure = async () => {
        if (!clientId || !clientSecret || !kioskId) {
            setError('Please fill in all fields')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await unifiedKioskApi.configure(clientId, clientSecret, kioskId)

            setConfigInfo({
                locationName: response.location_name,
                clientName: response.client_name,
            })
            setIsConfigured(true)

            // Clear temporary storage
            sessionStorage.removeItem('config_clientId')
            sessionStorage.removeItem('config_clientSecret')
            sessionStorage.removeItem('config_kioskId')

            // Navigate to idle screen after successful configuration
            setTimeout(() => {
                navigate('/', { replace: true })
            }, 1500)
        } catch (err) {
            console.error('Configuration failed:', err)
            setError(err instanceof Error ? err.message : 'Configuration failed. Please check your credentials.')
            setLoading(false)
        }
    }

    const isFormValid = clientId.trim() !== '' && clientSecret.trim() !== '' && kioskId.trim() !== '' && !loading

    if (loading && configInfo) {
        return (
            <div className="fixed inset-0 bg-black text-white overflow-y-auto z-50 min-h-screen w-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-6 max-w-md text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Kiosk Configured!</h2>
                    <p className="text-white/70">
                        {configInfo.clientName && <span className="block">{configInfo.clientName}</span>}
                        {configInfo.locationName && <span className="block text-sm">{configInfo.locationName}</span>}
                    </p>
                    <p className="text-sm text-white/50">Redirecting to home screen...</p>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black text-white overflow-y-auto z-50 min-h-screen w-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <LoadingPulse className="text-white" />
                    <p className="text-xl text-white/70 text-center">
                        Configuring kiosk...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black text-white overflow-y-auto z-50 min-h-screen w-full">
            <MotionFade className="flex flex-col min-h-screen w-full p-[4%] sm:p-[5%] md:p-[6%]">
                {/* Header */}
                <div className="mb-[6%]">
                    <h1 className="text-clamp-title font-bold text-white text-left">
                        Kiosk Configuration
                    </h1>
                    <p className="text-clamp-body text-white/70 text-left mt-2">
                        Enter your credentials to configure this kiosk
                    </p>
                </div>

                <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full gap-[6%]">
                    {/* Client ID */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-white/90 uppercase tracking-wide">
                            Client ID
                        </label>
                        <input
                            type="text"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            placeholder="your-client-id"
                            className="w-full p-[4%] bg-white/5 border-2 border-white/20 rounded-xl text-white placeholder:text-white/40 text-base focus:outline-none focus:border-white focus:bg-white/10 transition-all"
                        />
                    </div>

                    {/* Client Secret */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-white/90 uppercase tracking-wide">
                            Client Secret
                        </label>
                        <input
                            type="password"
                            value={clientSecret}
                            onChange={(e) => setClientSecret(e.target.value)}
                            placeholder="••••••••••••••••"
                            className="w-full p-[4%] bg-white/5 border-2 border-white/20 rounded-xl text-white placeholder:text-white/40 text-base focus:outline-none focus:border-white focus:bg-white/10 transition-all"
                        />
                    </div>

                    {/* Kiosk ID */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-white/90 uppercase tracking-wide">
                            Kiosk ID
                        </label>
                        <input
                            type="text"
                            value={kioskId}
                            onChange={(e) => setKioskId(e.target.value)}
                            placeholder="KSK-1234"
                            className="w-full p-[4%] bg-white/5 border-2 border-white/20 rounded-xl text-white placeholder:text-white/40 text-base focus:outline-none focus:border-white focus:bg-white/10 transition-all"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="w-full p-[4%] bg-red-900/30 border border-red-500/50 rounded-xl">
                            <p className="text-sm text-red-200 text-center">
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Already Configured Info */}
                    {configInfo && !loading && (
                        <div className="w-full p-[4%] bg-green-900/20 border border-green-500/30 rounded-xl">
                            <p className="text-sm text-green-200 text-center">
                                Kiosk is configured
                                {configInfo.clientName && <span className="block font-medium mt-1">{configInfo.clientName}</span>}
                                {configInfo.locationName && <span className="block text-xs opacity-70">{configInfo.locationName}</span>}
                            </p>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="w-full flex flex-col gap-4 mt-[4%]">
                        <Button
                            className={`!w-full !py-[4%] !text-base !font-bold !rounded-xl transition-all ${isFormValid
                                ? '!bg-white !text-black hover:!bg-gray-100'
                                : '!bg-white/20 !text-white/50 !cursor-not-allowed'
                                }`}
                            onClick={handleConfigure}
                            disabled={!isFormValid}
                        >
                            {configInfo ? 'Reconfigure' : 'Configure Kiosk'}
                        </Button>

                        {configInfo && (
                            <Button
                                className="!w-full !py-[4%] !text-base !font-bold !rounded-xl !bg-transparent !border-2 !border-white/30 !text-white hover:!bg-white/10 transition-all"
                                onClick={() => navigate('/', { replace: true })}
                            >
                                Go to Home
                            </Button>
                        )}
                    </div>
                </div>

                {/* Footer hint */}
                <div className="mt-auto pt-[4%] text-center">
                    <p className="text-xs text-white/40">
                        Contact your administrator if you don't have these credentials
                    </p>
                </div>
            </MotionFade>
        </div>
    )
}

export default ConfigScreen

