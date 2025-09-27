export enum AppState {
  IDLE,
  PROCESSING,
  RESULT,
}

export enum ImageStatus {
  QUEUED,
  PROCESSING,
  COMPLETED,
  ERROR,
}

export interface ImageData {
  base64: string;
  mimeType: string;
  name: string;
}

export interface ProcessedImageData extends ImageData {
  id: string;
  status: ImageStatus;
  processedUrl: string | null;
  error: string | null;
}
