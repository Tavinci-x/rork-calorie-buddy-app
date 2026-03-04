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
- Do NOT add any background color — the cat must float on a fully transparent background
- The cat should look cute and friendly with slightly oversized head (chibi proportions)
- NO realistic rendering — this must look like a 16-bit retro pixel art game character
- The pixel art cat should be immediately recognizable as the same cat from the photo`;

export async function convertToCartoon(base64Image: string, _imageUri?: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    console.log('EXPO_PUBLIC_OPENAI_API_KEY is not set');
    throw new Error('OpenAI API key is not configured');
  }

  console.log('Starting cartoon conversion via direct OpenAI call, base64 length:', base64Image.length);

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: buildFormData(base64Image),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('OpenAI response received successfully');

  if (!data.data?.[0]?.b64_json) {
    console.log('Unexpected OpenAI response shape:', JSON.stringify(data).slice(0, 200));
    throw new Error('No image data in OpenAI response');
  }

  return data.data[0].b64_json as string;
}

function buildFormData(base64Image: string): FormData {
  const binaryString = atob(base64Image);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'image/png' });

  const formData = new FormData();
  formData.append('image', blob, 'cat.png');
  formData.append('model', 'gpt-image-1');
  formData.append('prompt', PIXEL_ART_PROMPT);
  formData.append('size', '1024x1024');
  formData.append('quality', 'medium');
  formData.append('background', 'transparent');
  formData.append('response_format', 'b64_json');

  return formData;
}
