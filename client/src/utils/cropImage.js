/**
 * Utility functions for client-side avatar image cropping
 * Exports 512x512 JPEG files suitable for profile avatars.
 */

export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

/**
 * Draws the current crop window onto a target canvas (e.g. for live circular preview)
 * @param {HTMLImageElement} image
 * @param {{ x: number, y: number, width: number, height: number }} pixelCrop
 * @param {HTMLCanvasElement} canvas
 */
export function drawCropPreview(image, pixelCrop, canvas) {
  if (!image || !pixelCrop || !canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    width,
    height
  );
}

/**
 * Extracts the cropped square region from imageSrc and returns a 512x512 JPEG File
 * @param {string} imageSrc
 * @param {{ x: number, y: number, width: number, height: number }} pixelCrop
 * @param {number} outputSize
 * @returns {Promise<{ file: File, blob: Blob }>}
 */
export async function getCroppedImg(imageSrc, pixelCrop, outputSize = 512) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw square cropped region into the 512x512 canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to generate image blob from canvas'));
          return;
        }
        const file = new File([blob], 'profile-avatar.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve({ file, blob });
      },
      'image/jpeg',
      0.92
    );
  });
}
