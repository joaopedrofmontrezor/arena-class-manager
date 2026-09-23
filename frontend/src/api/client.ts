import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:3000",

  withCredentials: true,
});

const SAFE_METHODS = new Set([
  "get",
  "head",
  "options",
]);

function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(
      `(?:^|; )${name.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      )}=([^;]*)`,
    ),
  );

  return match
    ? decodeURIComponent(match[1])
    : null;
}

api.interceptors.request.use((config) => {
  const method = (
    config.method || "get"
  ).toLowerCase();

  if (SAFE_METHODS.has(method)) {
    return config;
  }

  const csrfToken = getCookie("csrf_token");

  if (csrfToken) {
    config.headers.set(
      "X-CSRF-Token",
      csrfToken,
    );
  }

  return config;
});

export default api;