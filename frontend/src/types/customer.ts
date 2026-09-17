export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  address: string | null;
}

export interface CustomerInput {
  name: string;
  mobile: string;
  email?: string;
  address?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
