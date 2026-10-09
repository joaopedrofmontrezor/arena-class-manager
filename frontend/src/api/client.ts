import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",

  withCredentials: true,
});

const SAFE_METHODS = new Set(["get", "head", "options"]);

const ACCESS_TOKEN_STORAGE_KEY = "arena_access_token";

let accessToken: string | null = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

let csrfToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();

  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (SAFE_METHODS.has(method)) {
    return config;
  }

  if (csrfToken) {
    config.headers.set("X-CSRF-Token", csrfToken);
  }

  return config;
});

export default api;
