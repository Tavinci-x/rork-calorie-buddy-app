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

export async function convertToCartoon(base64Image: string, _imageUri?: string): Promise<string> {
  console.log('Starting cartoon conversion via backend, base64 length:', base64Image.length);

  const result = await trpcClient.catMascot.generate.mutate({
    imageBase64: base64Image,
  });

  console.log('Cartoon conversion successful via backend');

  return result.imageBase64;
}
