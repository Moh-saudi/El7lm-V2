import { useState, useMemo, useCallback } from 'react';

interface UseDataPaginationOptions {
  initialPage?: number;
  initialItemsPerPage?: number;
  itemsPerPageOptions?: number[];
}

interface UseDataPaginationReturn<T> {
  // Data
  paginatedData: T[];
  totalItems: number;
  totalPages: number;
  
  // Pagination state
  currentPage: number;
  itemsPerPage: number;
  
  // Pagination controls
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setItemsPerPage: (itemsPerPage: number) => void;
  
  // Computed values
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  
  // Utility functions
  resetPagination: () => void;
}

export const useDataPagination = <T>(
  data: T[],
  options: UseDataPaginationOptions = {}
): UseDataPaginationReturn<T> => {
  const {
    initialPage = 1,
    initialItemsPerPage = 25,
    itemsPerPageOptions = [10, 25, 50, 100]
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Computed values
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Paginated data
  const paginatedData = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  // Pagination controls
  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  const handleSetItemsPerPage = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    // Reset to first page when changing items per page
    setCurrentPage(1);
  }, []);

  const resetPagination = useCallback(() => {
    setCurrentPage(initialPage);
    setItemsPerPage(initialItemsPerPage);
  }, [initialPage, initialItemsPerPage]);

  return {
    // Data
    paginatedData,
    totalItems,
    totalPages,
    
    // Pagination state
    currentPage,
    itemsPerPage,
    
    // Pagination controls
    goToPage,
    nextPage,
    previousPage,
    setItemsPerPage: handleSetItemsPerPage,
    
    // Computed values
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    
    // Utility functions
    resetPagination
  };
};
