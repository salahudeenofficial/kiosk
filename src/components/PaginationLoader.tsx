import LoadingPulse from './UI/LoadingPulse'

const PaginationLoader = () => {
  return (
    <div className="flex items-center justify-center py-[4%]">
      <div className="flex flex-col items-center gap-[2%]">
        <LoadingPulse className="text-slate-600" />
        <p className="text-sm text-slate-500">Loading more products...</p>
      </div>
    </div>
  )
}

export default PaginationLoader

