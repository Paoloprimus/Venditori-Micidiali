// lib/api/http.ts
// Helper "fetchJSON" con gestione errori uniforme e tipizzata.

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type FetchOptions = Omit<RequestInit, "body"> & { body?: any };

export async function fetchJSON<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const init: RequestInit = {
    ...options,
    headers,
    body: options.body
      ? options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  };

  const res = await fetch(url, init);

  // Proviamo a leggere JSON (o testo come fallback per log)
  const ct = res.headers.get("content-type") || "";
  let data: any = null;
  if (ct.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await res.text();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const msg =
      (data && (data.details || data.error)) ||
      `HTTP ${res.status} su ${url}`;
    throw new ApiError(String(msg), res.status, data);
  }

  return data as T;
}
