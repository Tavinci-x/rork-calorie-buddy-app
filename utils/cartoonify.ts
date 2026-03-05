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

const PIXEL_ART_PROMPT = `Convert this cat photo into a 16-bit pixel art sprite in the style of classic SNES / Super Nintendo era games.

CRITICAL REQUIREMENTS:
- MUST preserve the exact fur colors and color distribution from the photo
- MUST preserve the cat's specific markings, patches, and patterns exactly as they appear
- MUST match the cat's eye color precisely
- MUST capture the cat's body proportions (slim, average, chubby)
- MUST capture distinctive features (ear shape, face shape, tail type)
- Style: 16-bit pixel art, 64x64 to 128x128 pixel aesthetic with richer detail than 8-bit
- Use a 16-bit color palette with smooth shading, anti-aliased edges, and subtle gradients
- More detailed sprites with finer pixel work, like characters from Chrono Trigger, Secret of Mana, or Final Fantasy VI
- The cat should be sitting upright in a cute front-facing pose
- Clean pixel art with defined outlines but smoother than 8-bit chunky style
- BACKGROUND MUST BE COMPLETELY TRANSPARENT or plain white — no background color at all
- Do NOT draw any floor, shadow, border, frame, or pattern behind the cat
- The cat should look cute and friendly with slightly oversized head (chibi proportions)
- NO realistic rendering — this must look like a 16-bit retro pixel art game character
- The pixel art cat should be immediately recognizable as the same cat from the photo`;

export async function convertToCartoon(base64Image: string): Promise<string> {
  console.log('[cartoonify] Starting conversion via backend API, base64 length:', base64Image.length);

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || '';

  try {
    const response = await fetch(`${baseUrl}/api/generate-mascot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: cleanBase64,
      }),
    });

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
