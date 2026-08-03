/** Fetch wrapper that sends session cookies for authenticated API calls */
export function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, credentials: 'include' });
}
