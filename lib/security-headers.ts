export const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
} as const;

export function withNoStore(init?: ResponseInit): ResponseInit {
  return {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...NO_STORE_HEADERS,
    },
  };
}
