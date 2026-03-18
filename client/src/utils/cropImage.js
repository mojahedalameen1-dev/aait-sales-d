/**
 * Create an image element from a URL
 * @param {string} url 
 * @returns {Promise<HTMLImageElement>}
 */
export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // to avoid CORS issues
    image.src = url;
  });

/**
 * Get the cropped image as a Blob
 * @param {string} imageSrc - The source URL of the image
 * @param {Object} pixelCrop - The pixel crop area from react-easy-crop
 * @param {number} rotation - Rotation in degrees
 * @param {Object} targetSize - Optional { width, height } to resize the output
 * @returns {Promise<Blob>}
 */
export default async function getCroppedImg(imageSrc, pixelCrop, rotation = 0, targetSize = { width: 512, height: 512 }) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Set canvas size to the target size (512x512) for professional quality and consistent sizing
  canvas.width = targetSize ? targetSize.width : pixelCrop.width;
  canvas.height = targetSize ? targetSize.height : pixelCrop.height;

  // Set the background to white
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw the cropped image, resized to the target canvas size
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Return as a blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.9);
  });
}
