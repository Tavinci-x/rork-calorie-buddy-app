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

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (!url) {
    console.warn('[cartoonify] EXPO_PUBLIC_RORK_API_BASE_URL is not set');
    return '';
  }
  return url;
};

export async function convertToCartoon(base64Image: string): Promise<string> {
  console.log('[cartoonify] Starting conversion via REST endpoint, base64 length:', base64Image.length);

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/generate-mascot`;

  console.log('[cartoonify] Calling:', url);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageBase64: cleanBase64 }),
    });

    const responseText = await response.text();
    console.log('[cartoonify] Response status:', response.status);
    console.log('[cartoonify] Response (first 200):', responseText.slice(0, 200));

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.log('[cartoonify] Failed to parse response as JSON');
      throw new Error(`Server returned invalid response: ${responseText.slice(0, 200)}`);
    }

    if (!response.ok) {
      throw new Error(data?.error || `Server error ${response.status}`);
    }

    if (!data.imageBase64 || data.imageBase64.length < 100) {
      throw new Error('Received empty or invalid image data from server');
    }

    console.log('[cartoonify] Conversion successful, base64 length:', data.imageBase64.length);
    return data.imageBase64;
  } catch (err: any) {
    console.log('[cartoonify] Error:', err?.message ?? JSON.stringify(err));
    throw new Error(err?.message || 'Failed to generate pixel art');
  }
}
