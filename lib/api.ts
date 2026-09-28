// @ts-nocheck
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api(path, options = {}) {
  const { method = "GET", body, headers = {}, ...rest } = options;

  const init = {
    method,
    credentials: "same-origin",
    headers: { Accept: "application/json", ...headers },
    ...rest,
  };

  if (body !== undefined) {
    if (body instanceof FormData) {
      init.body = body;
    } else {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
  }

  let res;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError("Network error — please check your connection.", 0);
  }

  if (res.status === 204) return {};

  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await res.json().catch(() => null);
  }

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }

  return data;
}

export function errorMessage(err) {
  if (err instanceof ApiError) return err.message;
  if (err?.message) return err.message;
  return "Something went wrong. Please try again.";
}
