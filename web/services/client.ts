import axios from "axios";

import { deleteCookie, getCookie, setCookie } from "@/lib/cookies";

const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ""}/api`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Request interceptor: attach access token from cookie
apiClient.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;
  const token = getCookie("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 by attempting refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (typeof window === "undefined") return Promise.reject(error);

    const originalRequest = error.config;

    // Skip refresh/redirect for auth endpoints — let the caller handle the error
    const isAuthEndpoint = originalRequest.url?.startsWith("/auth/");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      const refreshToken = getCookie("refresh_token");

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${import.meta.env.VITE_API_URL ?? ""}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });
          setCookie("access_token", data.access_token, 24 * 60 * 60);
          setCookie("refresh_token", data.refresh_token, 7 * 24 * 60 * 60);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return apiClient(originalRequest);
        } catch {
          deleteCookie("access_token");
          deleteCookie("refresh_token");
          window.location.href = "/login";
        }
      } else {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
