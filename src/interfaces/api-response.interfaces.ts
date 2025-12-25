export interface ApiResponse<T = unknown> {
  status: number;
  success: boolean;
  message: string;
  code?: string;
  data?: T;
  errors?: unknown;
}
