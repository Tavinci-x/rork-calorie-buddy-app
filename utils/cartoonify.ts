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
  const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (!baseUrl) {
    console.log('EXPO_PUBLIC_RORK_API_BASE_URL is not set');
    throw new Error('API base URL not configured');
  }

  const url = `${baseUrl}/api/trpc/catMascot.generate`;
  console.log('Starting pixel art conversion via backend tRPC (OpenAI), base64 length:', base64Image.length);
  console.log('Calling:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      json: {
        imageBase64: base64Image,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log('Backend tRPC error:', response.status, errorText);
    throw new Error(`Failed to generate pixel art: ${response.status}`);
  }

  const data = await response.json();
  console.log('Pixel art conversion successful via backend (OpenAI)');

  const imageBase64 = data?.result?.data?.json?.imageBase64;
  if (!imageBase64) {
    console.log('Unexpected response shape:', JSON.stringify(data).slice(0, 300));
    throw new Error('No image data in response');
  }

  return imageBase64;
}
