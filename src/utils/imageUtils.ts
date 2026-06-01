export interface ImageDimensions {
  width: number;
  height: number;
}

export function resizeImage(
  base64: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = `data:image/jpeg;base64,${base64}`;
    } catch (err) {
      reject(err);
    }
  });
}

export function getImageDimensions(base64: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = `data:image/jpeg;base64,${base64}`;
    } catch (err) {
      reject(err);
    }
  });
}

export function normalizeBase64(input: string): string {
  return input.replace(/^data:image\/[a-z]+;base64,/, '');
}

export function isValidBase64Image(input: string): boolean {
  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  const cleaned = normalizeBase64(input);
  return base64Regex.test(cleaned) && cleaned.length > 100;
}
