export const ENV = {
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ||
    "http://localhost:5000/api",
  socketUrl:
    import.meta.env.VITE_SOCKET_URL?.replace(/\/+$/, "") ||
    "http://localhost:5000",
} as const;
