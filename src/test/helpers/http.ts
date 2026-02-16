type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
};

const DEFAULT_ORIGIN = "http://localhost:3000";

export function createJsonRequest(path: string, options: RequestOptions = {}): Request {
  const method = options.method ?? (options.body == null ? "GET" : "POST");
  const headers = new Headers(options.headers);

  if (options.body != null && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const url = path.startsWith("http")
    ? path
    : `${DEFAULT_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;

  return new Request(url, {
    method,
    headers,
    body: options.body == null ? undefined : JSON.stringify(options.body),
  });
}

export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
