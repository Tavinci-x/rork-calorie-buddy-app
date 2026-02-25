# CalBuddy — AI Cat Photo to Pixel Art Feature

> Copy and paste the prompt below directly into Rork as a follow-up message to your existing CalBuddy project.

---

Add an AI-powered feature that converts the user's real cat photo into a pixel art Tamagotchi-style mascot. The generated pixel art must closely match the user's actual cat — same fur colors, markings, eye color, breed shape, and unique features. This replaces the manual character creator as the PRIMARY onboarding method (keep the character creator as a fallback option).

## HOW IT WORKS — FULL FLOW

### Step 1: User takes or uploads a cat photo
- On the onboarding cat creation screen, show TWO options:
  - 📷 "Snap a Photo of Your Cat" (opens camera via expo-image-picker)
  - 🖼️ "Upload from Gallery" (opens photo library via expo-image-picker)
  - ✏️ "Create Manually Instead" (small text link below — opens the existing character creator as fallback)
- After selecting/taking a photo, show a preview with the cat photo in a circular frame
- Add a "Use This Photo" button and a "Retake" button
- Validate that the image is reasonable (not blank, not too dark) — basic check only

### Step 2: Send photo to Supabase Edge Function
- Upload the original cat photo to Supabase Storage bucket "cat-photos" at path: `{user_id}/original.jpg`
- Call a Supabase Edge Function called "generate-cat-mascot" that:
  1. Retrieves the uploaded photo from Supabase Storage
  2. Converts it to base64
  3. Sends it to OpenAI's GPT Image API (gpt-image-1) with the photo as input + a carefully crafted prompt
  4. Receives the pixel art result as base64
  5. Saves the generated pixel art to Supabase Storage at: `{user_id}/mascot.png`
  6. Updates the user's profile with the mascot URL
  7. Returns the mascot image URL to the app

### Step 3: Show result with loading experience
- While generating (takes ~5-15 seconds), show an engaging loading screen:
  - Animated pixel art sparkles/stars
  - Text cycling through fun messages:
    - "Analyzing your cat's fluffiness..."
    - "Counting whiskers..."
    - "Converting cuteness to pixels..."
    - "Teaching your cat to be 8-bit..."
    - "Almost there... your cat is looking purrfect!"
  - A progress bar (fake/animated, not real progress — just for UX)
- When complete, reveal the pixel art mascot with a dramatic animation:
  - Photo on the left, arrow in the middle, pixel art on the right (like the reference image)
  - Confetti burst
  - "Meet [Cat Name] in pixel form! 🎮"
- Show two buttons: "Love it! ✅" and "Try Again 🔄"
- "Try Again" lets user retake/reupload and regenerate (limit to 3 attempts to control API costs)

## SUPABASE EDGE FUNCTION — "generate-cat-mascot"

Create a Supabase Edge Function at `supabase/functions/generate-cat-mascot/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { userId } = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the original cat photo from storage
    const { data: photoData, error: downloadError } = await supabase.storage
      .from("cat-photos")
      .download(`${userId}/original.jpg`);

    if (downloadError) throw new Error("Failed to download cat photo");

    // Convert to base64
    const arrayBuffer = await photoData.arrayBuffer();
    const base64Image = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    // Call OpenAI GPT Image API
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/images/edits",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          image: [{
            type: "input_image",
            input_image: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          }],
          prompt: `Convert this cat photo into a pixel art sprite in retro Tamagotchi / virtual pet game style. 

CRITICAL REQUIREMENTS:
- MUST preserve the exact fur colors and color distribution from the photo
- MUST preserve the cat's specific markings, patches, and patterns exactly as they appear
- MUST match the cat's eye color precisely
- MUST capture the cat's body proportions (slim, average, chubby)
- MUST capture distinctive features (ear shape, face shape, tail type)
- Style: chunky pixel art, 32x32 to 64x64 pixel aesthetic, visible pixel blocks
- The cat should be sitting upright in a cute front-facing pose
- Simple, clean pixel art with thick outlines like a Tamagotchi pet or Pou game character
- Bright, clean solid-color background (single color, like bright green #4CAF50)
- The cat should look cute and friendly with slightly oversized head (chibi proportions)
- NO realistic rendering — this must look like a retro pixel art game character
- The pixel art cat should be immediately recognizable as the same cat from the photo`,
          size: "1024x1024",
          quality: "medium",
        }),
      }
    );

    const openaiData = await openaiResponse.json();
    
    if (!openaiData.data?.[0]?.b64_json) {
      throw new Error("Failed to generate image from OpenAI");
    }

    // Decode the generated image
    const mascotBase64 = openaiData.data[0].b64_json;
    const mascotBytes = Uint8Array.from(atob(mascotBase64), (c) =>
      c.charCodeAt(0)
    );

    // Upload generated mascot to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("cat-photos")
      .upload(`${userId}/mascot.png`, mascotBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) throw new Error("Failed to upload mascot");

    // Get public URL for the mascot
    const { data: urlData } = supabase.storage
      .from("cat-photos")
      .getPublicUrl(`${userId}/mascot.png`);

    // Update user profile with mascot URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        cat_mascot_url: urlData.publicUrl,
      })
      .eq("id", userId);

    if (updateError) throw new Error("Failed to update profile");

    return new Response(
      JSON.stringify({
        success: true,
        mascotUrl: urlData.publicUrl,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

## ENVIRONMENT VARIABLES NEEDED IN SUPABASE

Set these in your Supabase Edge Function secrets:
- `OPENAI_API_KEY` — Your OpenAI API key (get one at platform.openai.com)
- `SUPABASE_URL` — Auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — Auto-provided by Supabase

## GENERATING MULTIPLE MOOD STATES

After the initial mascot is generated successfully, trigger a SECOND Edge Function call (or extend the first one) to generate mood variant images. This runs in the background while the user proceeds to the app:

Generate these 6 mood variants using the same cat photo + the generated mascot as style reference:

1. **Happy** — "Same pixel art cat, eyes half-closed, purring, small hearts floating around it"
2. **Hungry** — "Same pixel art cat, staring intensely at an empty food bowl, mouth slightly open"
3. **Sad** — "Same pixel art cat, curled up in corner, single tear drop, ears down"
4. **Excited** — "Same pixel art cat, jumping up with sparkles, wide eyes, tail up"
5. **Sleeping** — "Same pixel art cat, curled into a ball, tiny Z's floating above, eyes closed"
6. **Mischievous** — "Same pixel art cat, pushing a glass off a table edge, smirking expression"

Store each variant in Supabase Storage at: `{user_id}/mascot_{mood}.png`

Add a `cat_moods_generated` boolean field to the profiles table. Set to true once all 6 are done.

IMPORTANT: Generate moods in the background using a queue-style approach. Don't block the user. Use `medium` quality for the first mascot (user sees it) and `low` quality for mood variants (they're smaller in the UI) to save costs.

## COST CONTROL

- Limit each user to 3 generation attempts during onboarding (track with a counter in profiles table: `mascot_generation_count`)
- Use `medium` quality for the main mascot (~$0.04 per image)
- Use `low` quality for mood variants (~$0.01 per image)
- Total cost per user: ~$0.04 (main) + 6 × $0.01 (moods) = ~$0.10 per user
- Show the character creator as fallback if:
  - API call fails
  - User has exhausted 3 attempts
  - User chooses "Create Manually Instead"

## UI UPDATES TO EXISTING APP

### Home Screen mascot display
- If `cat_mascot_url` exists in profile, display the generated pixel art image instead of the SVG character
- Show the appropriate mood variant image based on current mood state
- If mood images aren't generated yet (`cat_moods_generated` is false), use the main mascot for all moods
- The mascot image should still have the idle bounce animation (apply animation to the Image component)

### Cat Screen updates  
- Add a "Regenerate My Cat" button (uses one of the 3 attempts)
- Show all 6 mood states in a grid so user can preview them
- Add "How was this made?" info tooltip explaining the AI conversion

### Settings Screen updates
- Add "Regenerate Cat Mascot" option under the Cat section
- Show remaining generation attempts: "2 of 3 attempts remaining"
- Add option to "Switch to Manual Cat Creator" if user prefers

## ERROR HANDLING
- If OpenAI API fails: Show friendly error "Oops! Our pixel art machine is taking a cat nap. Try again or create your cat manually!"
- If image upload fails: Retry once, then fall back to character creator
- If network is down: Show offline message and offer character creator
- Always have the character creator as a working fallback — never leave the user stuck

---

## SETUP INSTRUCTIONS (Do this before testing)

1. Get an OpenAI API key at https://platform.openai.com/api-keys
2. Add credits to your OpenAI account ($5 minimum — this covers ~50 cat generations)
3. In Supabase Dashboard → Edge Functions → Create "generate-cat-mascot"
4. In Supabase Dashboard → Settings → Edge Functions → Secrets → Add OPENAI_API_KEY
5. In Supabase Dashboard → Storage → Create bucket "cat-photos" (set to public)
6. Add `mascot_generation_count` (integer, default 0) and `cat_moods_generated` (boolean, default false) columns to profiles table
