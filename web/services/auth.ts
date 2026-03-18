import type { TokenResponse, User } from "@/lib/types";
import apiClient from "./client";

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/login", { email, password });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>("/users/me");
  return data;
}

export async function refreshToken(refresh_token: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/refresh", { refresh_token });
  return data;
}

export async function register(
  email: string,
  firstName: string,
  lastName: string,
  password: string,
): Promise<{ message: string; requires_verification: boolean }> {
  const { data } = await apiClient.post("/auth/register", {
    email,
    first_name: firstName,
    last_name: lastName,
    password,
  });
  return data;
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const { data } = await apiClient.post("/auth/verify-email", { token });
  return data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await apiClient.post("/auth/forgot-password", { email });
  return data;
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  const { data } = await apiClient.post("/auth/reset-password", { token, password });
  return data;
}
