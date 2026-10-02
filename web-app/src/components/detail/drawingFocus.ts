/** Zoom and shift (in % of the image side) that centre a drawing inside its blank canvas. */
export interface DrawingFocus {
  zoom: number;
  shiftX: number;
  shiftY: number;
}

/** A channel below this is ink; PubChem paints the blank area #f5f5f5. */
const INK_THRESHOLD = 200;
/** Share of the plate the zoomed drawing may fill, leaving a margin. */
const FILL = 0.8;

/**
 * PubChem renders every compound centred in the same 500×500 square, so water
 * or NaCl is a speck in the middle. Finds the bounding box of the inked pixels
 * in RGBA data and returns the zoom (between 1 and `maxZoom`) and shift that
 * make the drawing fill the plate. Null when nothing is drawn.
 */
export function drawingFocus(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
  maxZoom = 3,
): DrawingFocus | null {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const inked =
        pixels[offset + 3] > 0 &&
        Math.min(pixels[offset], pixels[offset + 1], pixels[offset + 2]) < INK_THRESHOLD;
      if (!inked) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) return null;

  const span = Math.max((right - left + 1) / width, (bottom - top + 1) / height);
  const zoom = Math.min(maxZoom, Math.max(1, FILL / span));
  const centerX = (left + right + 1) / 2 / width;
  const centerY = (top + bottom + 1) / 2 / height;
  return { zoom, shiftX: (0.5 - centerX) * 100, shiftY: (0.5 - centerY) * 100 };
}

/** Reads a loaded image through a canvas; null when the browser refuses (cross-origin image). */
export function focusOnImage(image: HTMLImageElement): DrawingFocus | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    return drawingFocus(data, canvas.width, canvas.height);
  } catch {
    return null;
  }
}
