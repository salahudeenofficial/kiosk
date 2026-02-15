import { useState } from 'react'

export type SortOption = {
  value: string
  label: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price (Low to High)', sort_by: 'mrp', sort_order: 'asc' },
  { value: 'price_desc', label: 'Price (High to Low)', sort_by: 'mrp', sort_order: 'desc' },
  { value: 'rating', label: 'Rating', sort_by: 'ratings', sort_order: 'desc' },
  { value: 'newest', label: 'Newest', sort_by: 'created_at', sort_order: 'desc' },
  { value: 'oldest', label: 'Oldest', sort_by: 'created_at', sort_order: 'asc' },
  { value: 'name_asc', label: 'Name (A-Z)', sort_by: 'name', sort_order: 'asc' },
]

type SortDropdownProps = {
  value: string
  onChange: (option: SortOption) => void
}

const SortDropdown = ({ value, onChange, className = '' }: SortDropdownProps & { className?: string }) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = SORT_OPTIONS.find((opt) => opt.value === value) || SORT_OPTIONS[0]

  return (
    <div className="relative h-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-full flex items-center justify-between gap-3 px-4 bg-white border border-slate-300 min-w-[160px] text-slate-900 font-semibold hover:bg-slate-50 transition-colors ${className || 'rounded-xl'}`}
      >
        <span>{selectedOption?.label || 'Sort By'}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 w-full bg-white border-2 border-slate-300 rounded-xl shadow-lg z-20 max-h-[300px] overflow-y-auto">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-[4%] py-[3%] text-sm sm:text-base hover:bg-slate-50 transition-colors ${value === option.value ? 'bg-slate-100 font-semibold' : ''
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default SortDropdown

