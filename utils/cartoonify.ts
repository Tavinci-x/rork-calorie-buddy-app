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
- BACKGROUND MUST BE COMPLETELY TRANSPARENT — no background color at all
- Do NOT draw any floor, shadow, border, frame, or pattern behind the cat
- The cat should look cute and friendly with slightly oversized head (chibi proportions)
- NO realistic rendering — this must look like a 16-bit retro pixel art game character
- The pixel art cat should be immediately recognizable as the same cat from the photo`;

export async function convertToCartoon(base64Image: string): Promise<string> {
  console.log('[cartoonify] Starting conversion via toolkit, base64 length:', base64Image.length);

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const toolkitUrl = process.env.EXPO_PUBLIC_TOOLKIT_URL;
  if (!toolkitUrl) {
    throw new Error('EXPO_PUBLIC_TOOLKIT_URL is not configured');
  }

  const editUrl = `${toolkitUrl}/images/edit/`;
  console.log('[cartoonify] Using toolkit URL:', editUrl);

  try {
    const requestBody = JSON.stringify({
      prompt: PIXEL_ART_PROMPT,
      images: [{ type: 'image', image: cleanBase64 }],
      aspectRatio: '1:1',
    });
    console.log('[cartoonify] Request body length:', requestBody.length);

    const response = await fetch(editUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });

    console.log('[cartoonify] Response status:', response.status);
    console.log('[cartoonify] Response content-type:', response.headers.get('content-type'));

    const rawText = await response.text();
    console.log('[cartoonify] Raw response (first 300):', rawText.slice(0, 300));

    if (!response.ok) {
      console.log('[cartoonify] API error:', response.status, rawText.slice(0, 500));
      throw new Error(`Image generation failed (${response.status}): ${rawText.slice(0, 200)}`);
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr: any) {
      console.log('[cartoonify] JSON parse failed. Raw text (first 500):', rawText.slice(0, 500));
      throw new Error(`Response is not valid JSON: ${rawText.slice(0, 200)}`);
    }

    console.log('[cartoonify] Got response, mimeType:', data?.image?.mimeType);

    if (!data?.image?.base64Data) {
      console.log('[cartoonify] Unexpected response shape:', JSON.stringify(data).slice(0, 300));
      throw new Error('No image data in response');
    }

    console.log('[cartoonify] Conversion successful, base64 length:', data.image.base64Data.length);
    return data.image.base64Data;
  } catch (err: any) {
    console.log('[cartoonify] Error:', err?.message ?? JSON.stringify(err));
    throw new Error(err?.message || 'Failed to generate pixel art');
  }
}
