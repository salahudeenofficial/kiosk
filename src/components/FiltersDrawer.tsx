import { useEffect, useState } from 'react'
import Button from './UI/Button'

export type Filters = {
  gender?: string
  category_id?: number
  brand_id?: number
  min_price?: number
  max_price?: number
}

type Category = {
  id: number
  name: string
  gender: string
}

type Brand = {
  id: number
  name: string
}

type FiltersDrawerProps = {
  isOpen: boolean
  onClose: () => void
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  onApply: () => void
  onReset: () => void
  categories?: Category[]
  brands?: Brand[]
  priceRange?: { min: number; max: number } | null
  filtersLoading?: boolean
}

const FiltersDrawer = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onApply,
  onReset,
  categories = [],
  brands = [],
  priceRange = null,
  filtersLoading = false,
}: FiltersDrawerProps) => {
  const [localFilters, setLocalFilters] = useState<Filters>(filters)

  useEffect(() => {
    if (isOpen) setLocalFilters(filters)
  }, [isOpen, filters])

  const handleFilterChange = (key: keyof Filters, value: string | number | undefined) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }))
  }

  const handleApply = () => {
    onFiltersChange(localFilters)
    onApply()
  }

  const handleReset = () => {
    const emptyFilters: Filters = {}
    setLocalFilters(emptyFilters)
    onFiltersChange(emptyFilters)
    onReset()
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-white z-[100] overflow-y-auto shadow-2xl">
        <div className="flex flex-col h-full p-[4%]">
          <div className="flex items-center justify-between mb-[4%]">
            <h2 className="text-xl font-bold text-slate-900">Filters</h2>
            <button
              onClick={onClose}
              className="text-2xl text-slate-600 hover:text-slate-900"
            >
              ×
            </button>
          </div>

          <div className="flex flex-col gap-8">
            {/* Gender Filter */}
            <div>
              <label className="text-sm font-semibold text-slate-900 mb-[2%] block">
                Gender
              </label>
              <div className="flex flex-wrap gap-2">
                {['Men', 'Women', 'Unisex'].map((gender) => (
                  <button
                    key={gender}
                    onClick={() =>
                      handleFilterChange(
                        'gender',
                        localFilters.gender === gender ? undefined : gender,
                      )
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${localFilters.gender === gender
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-sm font-semibold text-slate-900 mb-[2%] block">
                Category
              </label>
              <select
                disabled={filtersLoading || categories.length === 0}
                value={localFilters.category_id || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'category_id',
                    e.target.value ? parseInt(e.target.value, 10) : undefined,
                  )
                }
                className="w-full p-3 border-2 border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {filtersLoading
                    ? 'Loading categories...'
                    : categories.length > 0
                      ? 'All Categories'
                      : 'No categories available'}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="text-sm font-semibold text-slate-900 mb-[2%] block">
                Brand
              </label>
              <select
                disabled={filtersLoading || brands.length === 0}
                value={localFilters.brand_id || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'brand_id',
                    e.target.value ? parseInt(e.target.value, 10) : undefined,
                  )
                }
                className="w-full p-3 border-2 border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {filtersLoading
                    ? 'Loading brands...'
                    : brands.length > 0
                      ? 'All Brands'
                      : 'No brands available'}
                </option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Filter */}
            <div>
              <label className="text-sm font-semibold text-slate-900 mb-[2%] block">
                Price Range
                {priceRange && (
                  <span className="text-xs font-normal text-slate-500 ml-2">
                    (₹{priceRange.min.toLocaleString()} - ₹{priceRange.max.toLocaleString()})
                  </span>
                )}
              </label>
              <div className="flex gap-4">
                <input
                  type="number"
                  placeholder={priceRange ? `Min (₹${priceRange.min.toLocaleString()})` : 'Min'}
                  min={priceRange?.min}
                  max={priceRange?.max}
                  value={localFilters.min_price || ''}
                  onChange={(e) =>
                    handleFilterChange(
                      'min_price',
                      e.target.value ? parseFloat(e.target.value) : undefined,
                    )
                  }
                  className="flex-1 p-3 border-2 border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500"
                />
                <input
                  type="number"
                  placeholder={priceRange ? `Max (₹${priceRange.max.toLocaleString()})` : 'Max'}
                  min={priceRange?.min}
                  max={priceRange?.max}
                  value={localFilters.max_price || ''}
                  onChange={(e) =>
                    handleFilterChange(
                      'max_price',
                      e.target.value ? parseFloat(e.target.value) : undefined,
                    )
                  }
                  className="flex-1 p-3 border-2 border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            {/* Buttons - Moved here to be closer */}
            <div className="flex flex-col gap-4 mt-4">
              <Button
                className="!bg-slate-800 !text-white hover:!bg-slate-900 !w-full"
                onClick={handleApply}
              >
                Apply Filters
              </Button>
              <Button
                className="!bg-white !text-slate-900 !border !border-slate-300 hover:!bg-slate-50 !w-full"
                onClick={handleReset}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default FiltersDrawer

