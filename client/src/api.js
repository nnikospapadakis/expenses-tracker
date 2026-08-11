// Path prefix the app is served under: "" in dev, "/tracker" in the production
// build. All API calls and hard redirects go through it so the app works both
// at the domain root (dev) and under /tracker (production).
export const API_PREFIX = import.meta.env.BASE_URL.replace(/\/+$/, "");

// Thin fetch wrapper. Always sends cookies so the login session is applied.
async function request(method, url, body) {
  const full = url.startsWith("/") ? API_PREFIX + url : url;
  const res = await fetch(full, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    // Session gone — bounce to login.
    const loginPath = `${API_PREFIX}/login`;
    if (!location.pathname.startsWith(loginPath)) location.href = loginPath;
    throw new Error("Not logged in");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  get: (url) => request("GET", url),
  post: (url, body) => request("POST", url, body),
  put: (url, body) => request("PUT", url, body),
  del: (url) => request("DELETE", url),
};

// EUR formatting (default for Greece). Change locale/currency here if needed.
export const fmt = (n) =>
  new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(n) || 0);
