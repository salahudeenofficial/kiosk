/**
 * Debug Panel - Development-only component for debugging the kiosk app
 * 
 * Features:
 * - View current session state
 * - View store values
 * - API mode toggle (mock/real)
 * - Quick actions (clear session, set mock data)
 * - API request log
 */

import { useState, useEffect, useRef } from 'react'
import { useKioskStore } from '../../store/kioskStore'
import { kioskApi } from '../../utils/kioskApi'
import { mockKioskApi, MOCK_CONFIG, MOCK_PRODUCTS, CATEGORIES } from '../../utils/mockKioskApi'

// Only show in development
const IS_DEV = import.meta.env.DEV

type LogEntry = {
    id: number
    timestamp: string
    type: 'request' | 'response' | 'error' | 'info'
    message: string
    data?: unknown
}

let logIdCounter = 0

const DebugPanel = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(true)
    const [activeTab, setActiveTab] = useState<'state' | 'api' | 'mock' | 'logs'>('state')
    const [apiMode, setApiMode] = useState<'real' | 'mock'>(MOCK_CONFIG.ENABLED ? 'mock' : 'real')
    const [logs, setLogs] = useState<LogEntry[]>([])
    const logsEndRef = useRef<HTMLDivElement>(null)

    // Store state
    const storeState = useKioskStore()

    // Add log entry
    const addLog = (type: LogEntry['type'], message: string, data?: unknown) => {
        const entry: LogEntry = {
            id: logIdCounter++,
            timestamp: new Date().toLocaleTimeString(),
            type,
            message,
            data,
        }
        setLogs(prev => [...prev.slice(-99), entry]) // Keep last 100 logs
    }

    // Scroll to bottom of logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [logs])

    // Intercept console.log for API calls
    useEffect(() => {
        if (!IS_DEV) return

        const originalLog = console.log
        const originalError = console.error
        const originalWarn = console.warn

        console.log = (...args) => {
            originalLog(...args)
            const message = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')
            if (message.includes('[API]') || message.includes('[MockAPI]')) {
                addLog('info', message)
            }
        }

        console.error = (...args) => {
            originalError(...args)
            const message = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')
            if (message.includes('API') || message.includes('error')) {
                addLog('error', message)
            }
        }

        console.warn = (...args) => {
            originalWarn(...args)
        }

        return () => {
            console.log = originalLog
            console.error = originalError
            console.warn = originalWarn
        }
    }, [])

    if (!IS_DEV) return null

    // Quick actions
    const handleClearSession = () => {
        kioskApi.clearSession()
        storeState.resetSession()
        mockKioskApi.resetSession()
        addLog('info', 'Session cleared')
    }

    const handleSetMockSession = () => {
        storeState.setSession({
            sessionId: 'debug_session_123',
            token: 'debug_token_abc',
            userId: 12345,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        })
        storeState.setUserGender('male')
        storeState.setUserHeight('175')
        addLog('info', 'Mock session set')
    }

    const handleToggleApiMode = () => {
        const newMode = apiMode === 'real' ? 'mock' : 'real'
        setApiMode(newMode)
        MOCK_CONFIG.ENABLED = newMode === 'mock'
        addLog('info', `API mode switched to: ${newMode}`)
    }

    const handleToggleErrors = () => {
        MOCK_CONFIG.SIMULATE_ERRORS = !MOCK_CONFIG.SIMULATE_ERRORS
        addLog('info', `Error simulation: ${MOCK_CONFIG.SIMULATE_ERRORS ? 'ON' : 'OFF'}`)
    }

    // Floating button (when closed)
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 left-4 z-[9999] bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-all"
                title="Open Debug Panel"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
        )
    }

    return (
        <div
            className={`fixed left-4 bottom-4 z-[9999] bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-2xl transition-all ${isMinimized ? 'w-80 h-12' : 'w-96 max-h-[80vh]'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-gray-700 bg-gray-800/50 rounded-t-lg">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${apiMode === 'mock' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                    <span className="text-xs font-bold text-white">DEBUG PANEL</span>
                    <span className="text-xs text-gray-400">({apiMode})</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                    >
                        {isMinimized ? '▲' : '▼'}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Tabs */}
                    <div className="flex border-b border-gray-700">
                        {(['state', 'api', 'mock', 'logs'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${activeTab === tab
                                    ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-800/50'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {tab.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-3 overflow-y-auto max-h-[60vh] text-xs">
                        {/* State Tab */}
                        {activeTab === 'state' && (
                            <div className="space-y-3">
                                <div className="bg-gray-800 p-2 rounded">
                                    <div className="text-gray-400 mb-1">Session</div>
                                    <div className="font-mono text-green-400">
                                        ID: {storeState.sessionId || 'null'}
                                    </div>
                                    <div className="font-mono text-green-400">
                                        User: {storeState.sessionUserId || 'null'}
                                    </div>
                                </div>

                                <div className="bg-gray-800 p-2 rounded">
                                    <div className="text-gray-400 mb-1">User Profile</div>
                                    <div className="font-mono text-blue-400">
                                        Gender: {storeState.userGender || 'null'}
                                    </div>
                                    <div className="font-mono text-blue-400">
                                        Height: {storeState.userHeight || 'null'}
                                    </div>
                                </div>

                                <div className="bg-gray-800 p-2 rounded">
                                    <div className="text-gray-400 mb-1">Products</div>
                                    <div className="font-mono text-yellow-400">
                                        Total: {storeState.products.length}
                                    </div>
                                    <div className="font-mono text-yellow-400">
                                        Selected: {storeState.selectedProducts.length}/3
                                    </div>
                                </div>

                                <div className="bg-gray-800 p-2 rounded">
                                    <div className="text-gray-400 mb-1">Flags</div>
                                    <div className="font-mono text-purple-400">
                                        Configured: {storeState.isConfigured ? '✓' : '✗'}
                                    </div>
                                    <div className="font-mono text-purple-400">
                                        Validated: {storeState.validated ? '✓' : '✗'}
                                    </div>
                                    <div className="font-mono text-purple-400">
                                        Has Image: {storeState.userImage ? '✓' : '✗'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* API Tab - Quick Actions */}
                        {activeTab === 'api' && (
                            <div className="space-y-2">
                                <button
                                    onClick={handleToggleApiMode}
                                    className={`w-full p-2 rounded text-left ${apiMode === 'mock' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'
                                        }`}
                                >
                                    Mode: {apiMode.toUpperCase()}
                                    <span className="block text-xs opacity-70">Click to toggle</span>
                                </button>

                                <button
                                    onClick={handleToggleErrors}
                                    className={`w-full p-2 rounded text-left ${MOCK_CONFIG.SIMULATE_ERRORS ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'
                                        }`}
                                >
                                    Error Simulation: {MOCK_CONFIG.SIMULATE_ERRORS ? 'ON' : 'OFF'}
                                </button>

                                <div className="border-t border-gray-700 my-2 pt-2">
                                    <div className="text-gray-400 mb-1">Quick Actions</div>
                                </div>

                                <button
                                    onClick={handleClearSession}
                                    className="w-full p-2 bg-red-900/50 hover:bg-red-900 text-red-300 rounded"
                                >
                                    Clear Session
                                </button>

                                <button
                                    onClick={handleSetMockSession}
                                    className="w-full p-2 bg-green-900/50 hover:bg-green-900 text-green-300 rounded"
                                >
                                    Set Mock Session
                                </button>

                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
                                >
                                    Refresh Page
                                </button>
                            </div>
                        )}

                        {/* Mock Data Tab */}
                        {activeTab === 'mock' && (
                            <div className="space-y-2">
                                <div className="text-gray-400 mb-2">Mock Data Summary</div>

                                <div className="bg-gray-800 p-2 rounded">
                                    <div className="text-white font-medium">{MOCK_PRODUCTS.length} Products</div>
                                    <div className="text-gray-400 text-xs mt-1">
                                        {CATEGORIES.map(c => c.name).join(', ')}
                                    </div>
                                </div>

                                <div className="bg-gray-800 p-2 rounded">
                                    <div className="text-gray-400 mb-1">Sample Products</div>
                                    {MOCK_PRODUCTS.slice(0, 5).map(p => (
                                        <div key={p.productId} className="flex items-center gap-2 py-1 border-b border-gray-700 last:border-0">
                                            <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-white truncate">{p.name}</div>
                                                <div className="text-gray-400">₹{p.mrp}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => {
                                        storeState.setProducts(MOCK_PRODUCTS.slice(0, 20).map(p => ({
                                            id: String(p.productId),
                                            title: p.name,
                                            price: p.mrp,
                                            image: p.imageUrl,
                                            description: p.brand.name,
                                            sizes: ['S', 'M', 'L', 'XL'],
                                        })))
                                        addLog('info', 'Loaded 20 mock products to store')
                                    }}
                                    className="w-full p-2 bg-purple-900/50 hover:bg-purple-900 text-purple-300 rounded"
                                >
                                    Load Mock Products to Store
                                </button>
                            </div>
                        )}

                        {/* Logs Tab */}
                        {activeTab === 'logs' && (
                            <div className="space-y-1">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-400">{logs.length} entries</span>
                                    <button
                                        onClick={() => setLogs([])}
                                        className="text-red-400 hover:text-red-300 text-xs"
                                    >
                                        Clear
                                    </button>
                                </div>

                                {logs.length === 0 ? (
                                    <div className="text-gray-500 text-center py-4">No logs yet</div>
                                ) : (
                                    logs.map(log => (
                                        <div
                                            key={log.id}
                                            className={`p-1.5 rounded text-xs font-mono ${log.type === 'error' ? 'bg-red-900/30 text-red-300' :
                                                log.type === 'request' ? 'bg-blue-900/30 text-blue-300' :
                                                    log.type === 'response' ? 'bg-green-900/30 text-green-300' :
                                                        'bg-gray-800 text-gray-300'
                                                }`}
                                        >
                                            <span className="text-gray-500">{log.timestamp}</span>
                                            {' '}{log.message}
                                        </div>
                                    ))
                                )}
                                <div ref={logsEndRef} />
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

export default DebugPanel

