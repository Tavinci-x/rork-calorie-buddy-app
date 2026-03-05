import { trpcClient } from '@/lib/trpc';

export const LOADING_MESSAGES = [
  "Analyzing your cat's fluffiness...",
  "Counting whiskers...",
  "Converting cuteness to pixels...",
  "Teaching your cat to be 8-bit...",
  "Mapping fur patterns...",
  "Calibrating purr levels...",
  "Almost there... looking purrfect!",
];

export const MAX_GENERATION_ATTEMPTS = 3;

export async function convertToCartoon(base64Image: string): Promise<string> {
  console.log('[cartoonify] Starting conversion via tRPC, base64 length:', base64Image.length);

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  try {
    const result = await trpcClient.catMascot.generate.mutate({
      imageBase64: cleanBase64,
    });

    if (!result.imageBase64 || result.imageBase64.length < 100) {
      throw new Error('Received empty or invalid image data from server');
    }

    console.log('[cartoonify] Conversion successful, base64 length:', result.imageBase64.length);
    return result.imageBase64;
  } catch (err: any) {
    console.log('[cartoonify] Error:', err?.message ?? JSON.stringify(err));
    throw new Error(err?.message || 'Failed to generate pixel art');
  }
}
