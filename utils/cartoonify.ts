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
  if (url) return url;

  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  if (projectId) {
    return `https://rork.app/api/project/${projectId}`;
  }

  return "https://localhost:0";
};

export async function convertToCartoon(base64Image: string): Promise<string> {
  console.log('[cartoonify] Starting conversion via backend OpenAI API');

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  console.log('[cartoonify] Cleaned base64 length:', cleanBase64.length);

  try {
    const url = `${getBaseUrl()}/api/generate-mascot`;
    console.log('[cartoonify] POST to:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageBase64: cleanBase64 }),
    });

    console.log('[cartoonify] Response status:', response.status);
    console.log('[cartoonify] Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[cartoonify] API error response:', errorText.slice(0, 500));
      throw new Error(`Image generation failed (${response.status}): ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    console.log('[cartoonify] Response keys:', Object.keys(data));
    console.log('[cartoonify] Has imageBase64:', !!data?.imageBase64);
    console.log('[cartoonify] imageBase64 length:', data?.imageBase64?.length ?? 0);

    const b64 = data?.imageBase64;
    if (!b64 || b64.length < 100) {
      console.log('[cartoonify] Invalid response data:', JSON.stringify(data).slice(0, 500));
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
