/**
 * Saves `data` as a pretty-printed JSON file through a temporary object URL.
 * The file is built in the browser; nothing is sent anywhere.
 */
export function downloadJson(fileName: string, data: unknown): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
