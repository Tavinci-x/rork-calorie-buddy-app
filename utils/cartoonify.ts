import { Platform } from 'react-native';
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

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([byteArray.buffer as ArrayBuffer], { type: mimeType });
}

async function callOpenAIDirectly(base64Image: string, imageUri?: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_OPENAI_API_KEY is not set');
  }

  console.log('Calling OpenAI images/edits directly from client...');
  console.log('API key present:', !!apiKey, 'key prefix:', apiKey.substring(0, 10) + '...');

  const formData = new FormData();

  if (Platform.OS !== 'web' && imageUri) {
    console.log('Using native file URI for FormData:', imageUri.substring(0, 50) + '...');
    formData.append('image', {
      uri: imageUri,
      type: 'image/png',
      name: 'cat.png',
    } as any);
  } else {
    console.log('Using base64 blob for FormData, base64 length:', base64Image.length);
    const blob = base64ToBlob(base64Image, 'image/png');
    formData.append('image', blob, 'cat.png');
  }

  formData.append('model', 'gpt-image-1');
  formData.append('prompt', PIXEL_ART_PROMPT);
  formData.append('size', '1024x1024');
  formData.append('quality', 'medium');
  formData.append('background', 'transparent');
  formData.append('response_format', 'b64_json');

  console.log('Sending request to OpenAI images/edits...');

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  console.log('OpenAI response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.log('OpenAI API error response:', errorText.substring(0, 500));
    throw new Error(`OpenAI API error ${response.status}: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  console.log('OpenAI response received, checking data structure...');

  if (!data.data?.[0]?.b64_json) {
    console.log('Unexpected response shape:', JSON.stringify(data).substring(0, 300));
    throw new Error('No image data in OpenAI response');
  }

  console.log('Pixel art conversion successful via direct OpenAI call');
  return data.data[0].b64_json as string;
}

async function callViaTRPC(base64Image: string): Promise<string> {
  console.log('Calling OpenAI via tRPC backend...');
  const result = await trpcClient.catMascot.generate.mutate({
    imageBase64: base64Image,
  });

  if (!result?.imageBase64) {
    console.log('No imageBase64 in tRPC result:', JSON.stringify(result).substring(0, 300));
    throw new Error('No image data in tRPC response');
  }

  console.log('Pixel art conversion successful via tRPC backend');
  return result.imageBase64;
}

export async function convertToCartoon(base64Image: string, imageUri?: string): Promise<string> {
  console.log('Starting pixel art conversion, base64 length:', base64Image.length, 'hasUri:', !!imageUri);

  try {
    const result = await callOpenAIDirectly(base64Image, imageUri);
    return result;
  } catch (directError: any) {
    console.log('Direct OpenAI call failed:', directError?.message || directError);

    console.log('Trying tRPC backend as fallback...');
    try {
      const result = await callViaTRPC(base64Image);
      return result;
    } catch (trpcError: any) {
      console.log('tRPC fallback also failed:', trpcError?.message || trpcError);
      throw new Error(
        `Direct call failed: ${directError?.message || 'unknown'}. Backend fallback failed: ${trpcError?.message || 'unknown'}`
      );
    }
  }
}
