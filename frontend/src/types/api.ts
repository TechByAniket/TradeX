export interface ApiErrorResponse {
  success: false;
  message: string;
}

export interface HealthResponse {
  success: boolean;
  status: string;
  database: string;
}
