/** Node's fetch does not add a browser Origin header. */
export function fetchWithModifiedHeaders(
  url: string,
  init: RequestInit,
  _requestHeaders: unknown[],
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  return fetchImpl(url, init);
}
