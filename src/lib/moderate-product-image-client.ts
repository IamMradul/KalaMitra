/**
 * Client-side helper that calls the backend moderation API.
 */

import {
  MODERATION_API_FAILURE_MESSAGE,
  MODERATION_REJECTED_MESSAGE,
} from '@/lib/product-moderation-messages';
import {
  isModerationApproved,
  scanTextForVulgarity,
  type ProductModerationResult,
} from '@/lib/product-moderation-rules';

export { MODERATION_API_FAILURE_MESSAGE, MODERATION_REJECTED_MESSAGE };

export async function compressImageForUpload(
  file: File
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1200;
      let { width, height } = img;

      if (Math.max(width, height) <= maxDim && file.size < 600_000) {
        resolve(file);
        return;
      }

      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        0.82
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

export interface ModerationClientResponse {
  approved: boolean;
  result?: ProductModerationResult;
  message?: string;
  moderation_status?: 'approved' | 'pending';
}

export function isModerationResponseAllowed(
  response: ModerationClientResponse,
  isVirtual?: boolean
): boolean {
  if (!response.approved) return false;
  if (response.result && !isModerationApproved(response.result, isVirtual)) return false;
  return true;
}

export function getModerationFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImageForModeration(
  file: File
): Promise<{ base64: string; mimeType: string }> {
  if (!file.type.startsWith('image/') || file.size < 400_000) {
    return {
      base64: await fileToBase64(file),
      mimeType: file.type || 'image/jpeg',
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 768;
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        fileToBase64(file)
          .then((base64) =>
            resolve({ base64, mimeType: file.type || 'image/jpeg' })
          )
          .catch(reject);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      fileToBase64(file)
        .then((base64) =>
          resolve({ base64, mimeType: file.type || 'image/jpeg' })
        )
        .catch(reject);
    };

    img.src = url;
  });
}

const MODERATION_TIMEOUT_MS = 30_000;

export async function moderateProductImage(params: {
  file?: File;
  imageUrl?: string;
  title?: string;
  description?: string;
  userId?: string;
  isVirtual?: boolean;
}): Promise<ModerationClientResponse> {
  const { file, imageUrl, title, description, userId, isVirtual } = params;

  if (!file && !imageUrl) {
    throw new Error('No image provided for moderation');
  }

  const body: {
    imageBase64?: string;
    mimeType?: string;
    imageUrl?: string;
    title?: string;
    description?: string;
    userId?: string;
    isVirtual?: boolean;
  } = {};

  if (file) {
    const compressed = await compressImageForModeration(file);
    body.imageBase64 = compressed.base64;
    body.mimeType = compressed.mimeType;
  } else if (imageUrl) {
    body.imageUrl = imageUrl;
  }

  if (title) body.title = title;
  if (description) body.description = description;
  if (userId) body.userId = userId;
  if (isVirtual !== undefined) body.isVirtual = isVirtual;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MODERATION_TIMEOUT_MS);

  try {
    const response = await fetch('/api/moderate-product-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = (await response.json()) as ModerationClientResponse;

    if (response.status === 403) {
      const reason = data.result?.reason || 'Violates safety guidelines.';
      const msg = `❌ Product Upload Rejected\n\nAdult products or sex toys are not allowed on this marketplace.\n\nReason:\n${reason}\n\nPlease upload an appropriate product and try again.`;
      throw new Error(msg);
    }

    if (!response.ok) {
      if (response.status === 400 || response.status === 413 || response.status === 415) {
        throw new Error(`Image Validation Error: ${data.message || 'The image is too large or has an invalid format.'}`);
      }

      // Service error (503, 429, etc.) — allow upload through with a warning unless text contains vulgarity
      console.warn('[moderation-client] Moderation service returned error:', response.status, data.message);
      const isVulgar = (title && scanTextForVulgarity(title)) || (description && scanTextForVulgarity(description));
      if (isVulgar) {
        throw new Error(`❌ Product Upload Rejected\n\nAdult products or sex toys are not allowed on this marketplace.\n\nReason:\nInappropriate or adult-related content detected.\n\nPlease upload an appropriate product and try again.`);
      }
      return { approved: true, moderation_status: 'pending', message: 'Moderation service unavailable — upload allowed pending later review.' } as ModerationClientResponse;
    }

    if (!isModerationResponseAllowed(data, isVirtual)) {
      const reason = data.result?.reason || 'Violates safety guidelines.';
      const msg = `❌ Product Upload Rejected\n\nAdult products or sex toys are not allowed on this marketplace.\n\nReason:\n${reason}\n\nPlease upload an appropriate product and try again.`;
      throw new Error(msg);
    }

    return data;
  } catch (err) {
    if (err instanceof Error && (err.message.includes('Product Upload Rejected') || err.message.includes('Image Validation Error'))) {
      throw err;
    }
    // Timeout, network error, or service unavailability — allow upload through unless text is vulgar
    console.warn('[moderation-client] Moderation check failed (timeout or network error), allowing upload:', err);
    const isVulgar = (title && scanTextForVulgarity(title)) || (description && scanTextForVulgarity(description));
    if (isVulgar) {
      throw new Error(`❌ Product Upload Rejected\n\nAdult products or sex toys are not allowed on this marketplace.\n\nReason:\nInappropriate or adult-related content detected.\n\nPlease upload an appropriate product and try again.`);
    }
    return { approved: true, moderation_status: 'pending', message: 'Moderation check skipped due to service unavailability.' } as ModerationClientResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}
