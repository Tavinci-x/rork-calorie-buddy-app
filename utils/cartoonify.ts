import { trpcClient } from '@/lib/trpc';

export const LOADING_MESSAGES = [
  "Analyzing your cat's fluffiness...",
  "Counting whiskers...",
  "Converting cuteness to pixels...",
  "Teaching your cat to be 16-bit...",
  "Mapping fur patterns...",
  "Calibrating purr levels...",
  "Almost there... looking purrfect!",
];

export const MAX_GENERATION_ATTEMPTS = 3;

export async function convertToCartoon(base64Image: string): Promise<string> {
  console.log('Starting pixel art conversion via tRPC client (OpenAI), base64 length:', base64Image.length);

  try {
    const result = await trpcClient.catMascot.generate.mutate({
      imageBase64: base64Image,
    });

    console.log('Pixel art conversion successful via tRPC client (OpenAI)');

    if (!result?.imageBase64) {
      console.log('No imageBase64 in result:', JSON.stringify(result).slice(0, 300));
      throw new Error('No image data in response');
    }

    return result.imageBase64;
  } catch (error: any) {
    console.log('tRPC mutation error:', error?.message || error);
    console.log('Full error:', JSON.stringify(error, null, 2).slice(0, 500));
    throw error;
  }
}
