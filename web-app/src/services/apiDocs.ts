import type { CodeSample } from "../components/ui/code-block";

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

/** Environment variable the snippets read the v1 API key from: keys never go into code or URLs. */
export const API_KEY_ENV = "ELEMENTAPI_KEY";

/**
 * curl, JavaScript and Python snippets for a GET request. `keyed` adds the
 * `X-API-Key` header, read from the environment instead of printing the key.
 */
export function requestSnippets(url: string, keyed = false): CodeSample[] {
  const curl = keyed
    ? `curl -s "${url}" \\\n  -H "X-API-Key: $${API_KEY_ENV}"`
    : `curl -s "${url}"`;
  const fetchOptions = keyed
    ? `, {\n  headers: { "X-API-Key": process.env.${API_KEY_ENV} },\n}`
    : "";
  const python = keyed
    ? `import os\nimport requests\n\nresponse = requests.get(\n    "${url}",\n    headers={"X-API-Key": os.environ["${API_KEY_ENV}"]},\n)\nprint(response.json())`
    : `import requests\n\nprint(requests.get("${url}").json())`;
  return [
    { label: "curl", code: curl },
    {
      label: "JavaScript",
      code: `const response = await fetch("${url}"${fetchOptions});\nconsole.log(await response.json());`,
    },
    { label: "Python", code: python },
  ];
}

/** curl POST with a JSON body and the API key header (key read from the environment). */
export function postSnippet(url: string, body: Record<string, unknown>): string {
  return [
    `curl -s -X POST "${url}"`,
    `  -H "X-API-Key: $${API_KEY_ENV}"`,
    `  -H "Content-Type: application/json"`,
    `  -d '${JSON.stringify(body)}'`,
  ].join(" \\\n");
}

/** Badge tone for an HTTP status: 2xx success, 304 info, other 4xx warning, everything else danger. */
export function statusTone(
  status: number,
): "success" | "info" | "warning" | "destructive" {
  if (status >= 200 && status < 300) return "success";
  if (status === 304) return "info";
  if (status >= 400 && status < 500) return "warning";
  return "destructive";
}
