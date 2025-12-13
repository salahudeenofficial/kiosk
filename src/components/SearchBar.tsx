type SearchBarProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const SearchBar = ({ value, onChange, placeholder = 'Search products...' }: SearchBarProps) => {
  // The localValue state and debouncing useEffect are removed as per the new input handling.
  // The input now directly uses the 'value' prop and calls 'onChange' directly.

  return (
    <div className="relative w-full h-[56px]">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full h-full pl-12 pr-4 bg-white border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-300 focus:ring-0 focus:border-slate-500 sm:text-sm font-medium transition-colors"
        placeholder={placeholder}
      />
    </div>
  )
}

export default SearchBar

