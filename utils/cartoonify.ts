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
  console.log('[cartoonify] Starting conversion via backend API, base64 length:', base64Image.length);

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || '';

  console.log('[cartoonify] Using backend URL:', baseUrl);

  if (!baseUrl) {
    throw new Error('Backend URL is not configured. EXPO_PUBLIC_RORK_API_BASE_URL is missing.');
  }

  try {
    const url = `${baseUrl}/generate-mascot`;
    console.log('[cartoonify] Fetching:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: cleanBase64,
      }),
    });

    console.log('[cartoonify] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[cartoonify] Backend API error:', response.status, errorText);
      throw new Error(`Image generation failed (${response.status}): ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    console.log('[cartoonify] Got response, has imageBase64:', !!data?.imageBase64);

    const b64 = data?.imageBase64;
    if (!b64 || b64.length < 100) {
      throw new Error('Received empty or invalid image data');
    }

    console.log('[cartoonify] Conversion successful, base64 length:', b64.length);
    return b64;
  } catch (err: any) {
    console.log('[cartoonify] Error:', err?.message ?? JSON.stringify(err));
    throw new Error(err?.message || 'Failed to generate pixel art');
  }
}
