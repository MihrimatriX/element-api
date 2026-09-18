/** Playground display: 304 has no JSON body. */
export function playgroundView(
  status: number,
  etag: string | null,
  body: unknown,
) {
  if (status === 304) {
    return {
      status: 304,
      etag,
      note: "Gövde yok. If-None-Match aynı kaydı gördü.",
    };
  }
  return body;
}
