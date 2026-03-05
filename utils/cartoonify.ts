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
  console.log('[cartoonify] Starting conversion via tRPC backend');

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  console.log('[cartoonify] Cleaned base64 length:', cleanBase64.length);

  try {
    console.log('[cartoonify] Calling catMascot.generate via tRPC...');
    const result = await trpcClient.catMascot.generate.mutate({ imageBase64: cleanBase64 });

    console.log('[cartoonify] Response received, has imageBase64:', !!result?.imageBase64);
    console.log('[cartoonify] imageBase64 length:', result?.imageBase64?.length ?? 0);

    const b64 = result?.imageBase64;
    if (!b64 || b64.length < 100) {
      console.log('[cartoonify] Invalid response data');
      throw new Error('Received empty or invalid image data from API');
    }

    console.log('[cartoonify] Conversion successful, output base64 length:', b64.length);
    return b64;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.log('[cartoonify] Error:', message);
    throw new Error(message || 'Failed to generate pixel art');
  }
}
