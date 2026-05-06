export interface PaginatedResult<T> {
  docs: T[];
  totalDocs: number;
  totalPages: number;
  currentPage: number;
  totalPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}