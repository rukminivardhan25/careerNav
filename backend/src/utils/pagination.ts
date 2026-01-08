/**
 * Pagination utility functions
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Parse pagination parameters from request query
 */
export function parsePaginationParams(req: any): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(req.query.pageSize || "10", 10))
  );

  return { page, pageSize };
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  total: number,
  page: number,
  pageSize: number
) {
  const totalPages = Math.ceil(total / pageSize);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext,
    hasPrev,
  };
}

/**
 * Get paginated data slice
 */
export function getPaginatedData<T>(
  data: T[],
  page: number,
  pageSize: number
): T[] {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return data.slice(startIndex, endIndex);
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: calculatePagination(total, page, pageSize),
  };
}





