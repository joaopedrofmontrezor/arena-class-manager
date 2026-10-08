import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",

  withCredentials: true,
});

const SAFE_METHODS = new Set(["get", "head", "options"]);

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();

  if (SAFE_METHODS.has(method)) {
    return config;
  }

  if (csrfToken) {
    config.headers.set("X-CSRF-Token", csrfToken);
  }

  return config;
});

export default api;
