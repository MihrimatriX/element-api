/**
 * PubChem structure depictions use a fixed bond length, so water is a speck in the
 * middle of a 500 px canvas while sucrose fills it. These helpers find the drawn
 * molecule and zoom each thumbnail so every molecule fills its plate the same way.
 */

/** Edges of the drawn molecule as fractions (0–1) of the image side. */
export interface InkBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** CSS transform values for one thumbnail: zoom, then shift (percent of the image box). */
export interface StructureFit {
  scale: number;
  x: number;
  y: number;
}

/** Plate height / width of the compound card (4:3). */
export const PLATE_RATIO = 3 / 4;
/** Share of the plate the molecule should cover. */
const FILL = 0.72;
const MIN_SCALE = 0.6;
const MAX_SCALE = 3;
/** Side of the downscaled copy that is scanned for ink. */
const SAMPLE_SIZE = 96;

export const NO_FIT: StructureFit = { scale: 1, x: 0, y: 0 };

/**
 * Bounding box of the pixels that differ from the background (the top-left pixel)
 * in a square RGBA buffer; `null` when the image is blank.
 */
export function inkBounds(
  pixels: ArrayLike<number>,
  size: number,
  tolerance = 30,
): InkBounds | null {
  const [red, green, blue] = [pixels[0], pixels[1], pixels[2]];
  let left = size;
  let top = size;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const distance =
        Math.abs(pixels[index] - red) +
        Math.abs(pixels[index + 1] - green) +
        Math.abs(pixels[index + 2] - blue);
      if (distance <= tolerance) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) return null;
  return {
    left: left / size,
    top: top / size,
    right: (right + 1) / size,
    bottom: (bottom + 1) / size,
  };
}

/**
 * Zoom and shift that centre the molecule in a plate as wide as the (square) image
 * and `PLATE_RATIO` as tall, filling `FILL` of the tighter side.
 */
export function fitToPlate(bounds: InkBounds): StructureFit {
  const width = Math.max(bounds.right - bounds.left, 0.02);
  const height = Math.max(bounds.bottom - bounds.top, 0.02);
  const scale = Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, Math.min(FILL / width, (FILL * PLATE_RATIO) / height)),
  );
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  return {
    scale,
    x: (0.5 - centerX) * scale * 100,
    y: (0.5 - centerY) * scale * 100,
  };
}

/** Measures a loaded structure image; falls back to no zoom when its pixels cannot be read. */
export function measureStructure(image: HTMLImageElement): StructureFit {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return NO_FIT;
  context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  try {
    const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const bounds = inkBounds(data, SAMPLE_SIZE);
    return bounds ? fitToPlate(bounds) : NO_FIT;
  } catch {
    // A cross-origin image without CORS headers taints the canvas.
    return NO_FIT;
  }
}
