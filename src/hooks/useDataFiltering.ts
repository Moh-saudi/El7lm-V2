import React, { useCallback, useMemo, useState } from 'react';

interface FilterOption {
  key: string;
  value: any;
  label?: string;
}

interface SortOption {
  key: string;
  direction: 'asc' | 'desc';
}

interface UseDataFilteringOptions<T> {
  initialFilters?: FilterOption[];
  initialSort?: SortOption;
  searchFields?: (keyof T)[];
  debounceMs?: number;
}

interface UseDataFilteringReturn<T> {
  // Filtered and sorted data
  filteredData: T[];

  // Filter state
  filters: FilterOption[];
  searchTerm: string;
  sortOption: SortOption | null;

  // Filter controls
  addFilter: (filter: FilterOption) => void;
  removeFilter: (key: string) => void;
  updateFilter: (key: string, value: any) => void;
  clearFilters: () => void;

  // Search controls
  setSearchTerm: (term: string) => void;
  clearSearch: () => void;

  // Sort controls
  setSort: (sort: SortOption) => void;
  clearSort: () => void;

  // Computed values
  hasActiveFilters: boolean;
  hasSearchTerm: boolean;
  hasSort: boolean;
  totalFilteredItems: number;
}

export const useDataFiltering = <T extends Record<string, any>>(
  data: T[],
  options: UseDataFilteringOptions<T> = {}
): UseDataFilteringReturn<T> => {
  const {
    initialFilters = [],
    initialSort = null,
    searchFields = [],
    debounceMs = 300
  } = options;

  const [filters, setFilters] = useState<FilterOption[]>(initialFilters);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption | null>(initialSort);

  // Debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  // Filter controls
  const addFilter = useCallback((filter: FilterOption) => {
    setFilters(prev => {
      const existingIndex = prev.findIndex(f => f.key === filter.key);
      if (existingIndex >= 0) {
        const newFilters = [...prev];
        newFilters[existingIndex] = filter;
        return newFilters;
      }
      return [...prev, filter];
    });
  }, []);

  const removeFilter = useCallback((key: string) => {
    setFilters(prev => prev.filter(f => f.key !== key));
  }, []);

  const updateFilter = useCallback((key: string, value: any) => {
    setFilters(prev => {
      const existingIndex = prev.findIndex(f => f.key === key);
      if (existingIndex >= 0) {
        const newFilters = [...prev];
        newFilters[existingIndex] = { ...newFilters[existingIndex], value };
        return newFilters;
      }
      return [...prev, { key, value }];
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  // Search controls
  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  // Sort controls
  const setSort = useCallback((sort: SortOption) => {
    setSortOption(sort);
  }, []);

  const clearSort = useCallback(() => {
    setSortOption(null);
  }, []);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (debouncedSearchTerm && searchFields.length > 0) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      result = result.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(searchLower);
        })
      );
    }

    // Apply filters
    filters.forEach(filter => {
      result = result.filter(item => {
        const itemValue = item[filter.key];
        if (filter.value === null || filter.value === undefined) {
          return itemValue === null || itemValue === undefined;
        }
        if (typeof filter.value === 'string') {
          return itemValue && itemValue.toString().toLowerCase().includes(filter.value.toLowerCase());
        }
        if (typeof filter.value === 'boolean') {
          return itemValue === filter.value;
        }
        if (Array.isArray(filter.value)) {
          return filter.value.includes(itemValue);
        }
        return itemValue === filter.value;
      });
    });

    // Apply sort
    if (sortOption) {
      result.sort((a, b) => {
        const aValue = a[sortOption.key];
        const bValue = b[sortOption.key];

        if (aValue === bValue) return 0;

        const comparison = aValue < bValue ? -1 : 1;
        return sortOption.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, debouncedSearchTerm, searchFields, filters, sortOption]);

  // Computed values
  const hasActiveFilters = filters.length > 0;
  const hasSearchTerm = searchTerm.length > 0;
  const hasSort = sortOption !== null;
  const totalFilteredItems = filteredData.length;

  return {
    // Filtered and sorted data
    filteredData,

    // Filter state
    filters,
    searchTerm,
    sortOption,

    // Filter controls
    addFilter,
    removeFilter,
    updateFilter,
    clearFilters,

    // Search controls
    setSearchTerm,
    clearSearch,

    // Sort controls
    setSort,
    clearSort,

    // Computed values
    hasActiveFilters,
    hasSearchTerm,
    hasSort,
    totalFilteredItems
  };
};
