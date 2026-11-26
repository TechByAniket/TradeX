import { apiClient } from "./apiClient";
import type { HealthResponse } from "@/types/api";
import type {
  AuthResponse,
  GoogleAuthPayload,
  LoginPayload,
  MeResponse,
  RegisterPayload,
} from "@/types/auth";

export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>("/health");
  return data;
}

export async function registerUser(
  payload: RegisterPayload
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", payload);
  return data;
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", payload);
  return data;
}

export async function loginWithGoogle(
  payload: GoogleAuthPayload
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/google", payload);
  return data;
}

export async function fetchCurrentUser(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>("/auth/me");
  return data;
}
