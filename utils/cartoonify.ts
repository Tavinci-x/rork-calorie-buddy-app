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
  console.log('[cartoonify] Starting conversion via Supabase Edge Function');
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase env vars not set');

  const response = await fetch(`${supabaseUrl}/functions/v1/swift-action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ imageBase64: cleanBase64 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Edge Function error: ${err}`);
  }

  const result = await response.json();
  const b64 = result?.imageBase64;

  if (!b64 || b64.length < 100) {
    throw new Error('Received empty or invalid image data');
  }

  return b64;
}
