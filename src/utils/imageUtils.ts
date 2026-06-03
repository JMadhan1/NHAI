export interface ImageDimensions {
  width: number;
  height: number;
}

export function normalizeBase64(input: string): string {
  return input.replace(/^data:image\/[a-z]+;base64,/, '');
}

export function isValidBase64Image(input: string): boolean {
  if (!input || input.length < 100) return false;
  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  const cleaned = normalizeBase64(input);
  return base64Regex.test(cleaned);
}

export function base64ToBytes(base64: string): Uint8Array {
  const cleaned = normalizeBase64(base64);
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function estimateBase64Size(base64: string): number {
  const cleaned = normalizeBase64(base64);
  return Math.floor((cleaned.length * 3) / 4);
}
