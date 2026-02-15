import AutoCamera from '../components/Camera/AutoCamera'
import MotionFade from '../components/UI/MotionFade'

import useAutoNavigate from '../hooks/useAutoNavigate'
import PoseGuide from '../components/UI/PoseGuide'

const CaptureScreen = () => {
  useAutoNavigate()

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden w-full text-slate-900">

      {/* Absolute Positioned Square Pose Guide */}
      <div className="absolute top-6 right-6 w-40 h-40 md:w-56 md:h-56 z-40 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <PoseGuide />
      </div>

      {/* Header Section */}
      <div className="w-full px-[4%] pt-6 pb-4 shrink-0">
        <div className="max-w-[1920px] mx-auto">
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-lg md:max-w-xl pr-16 md:pr-64">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight leading-none">
                AI Capture
              </h2>
              <div className="mt-4 inline-flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-md">
                <svg className="w-6 h-6 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-base md:text-lg text-slate-600 font-medium leading-relaxed">
                  Capture will start only when your pose <span className="text-slate-900 font-bold">matches the GIF</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-8 self-end md:self-auto">
              {/* Context/Help Info */}
              <div className="hidden md:block text-right lg:mr-[16rem]"> {/* Added margin to avoid overlap with absolute guide if needed, though flex might just be empty here now */}
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm font-medium text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  AI Camera Ready
                </span>
              </div>
            </div>
          </div>

          <hr className="mt-8 border-slate-100" />
        </div>
      </div>

      <MotionFade className="flex-1 w-full min-h-0 relative flex flex-col">
        <AutoCamera />
      </MotionFade>
    </div>
  )
}

export default CaptureScreen

