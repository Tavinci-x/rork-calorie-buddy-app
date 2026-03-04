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
  console.log('Starting cartoon conversion via backend, base64 length:', base64Image.length);

  try {
    const result = await trpcClient.catMascot.generate.mutate({
      imageBase64: base64Image,
    });

    console.log('Cartoon conversion successful');
    return result.imageBase64;
  } catch (err: any) {
    console.log('Full error:', JSON.stringify(err));
    const message = err?.message || err?.data?.message || JSON.stringify(err);
    throw new Error(message);
  }
}
