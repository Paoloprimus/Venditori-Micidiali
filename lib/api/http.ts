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

/** fetchJSON<T>
 * - Imposta automaticamente Content-Type/Accept per JSON (tranne quando body è FormData/Blob).
 * - Propaga status e body d'errore dentro ApiError (e.details).
 */
export async function fetchJSON<T = any>(url: string, opts: FetchOptions = {}): Promise<T> {
  const { body, headers, ...rest } = opts;

  const isFormLike =
    typeof FormData !== "undefined" && body instanceof FormData ||
    (typeof Blob !== "undefined" && body instanceof Blob);

  const finalHeaders: HeadersInit = {
    Accept: "application/json",
    ...(headers || {}),
    ...(isFormLike ? {} : { "Content-Type": "application/json" }),
  };

  const init: RequestInit = {
    method: rest.method || (body ? "POST" : "GET"),
    ...rest,
    headers: finalHeaders,
    body: body == null ? undefined : (isFormLike ? body : JSON.stringify(body)),
  };

  const res = await fetch(url, init);

  // prova a leggere JSON se disponibile
  const ctype = res.headers.get("content-type") || "";
  let data: any = null;
  if (ctype.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    // fallback: prova testo
    try {
      const txt = await res.text();
      data = txt ? { message: txt } : null;
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error || data.details)) ||
      `HTTP ${res.status} su ${url}`;
    throw new ApiError(String(msg), res.status, data);
  }

  return data as T;
}
