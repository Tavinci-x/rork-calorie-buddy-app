import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

async function removeBackground(imageBase64: string): Promise<string> {
  const removeBgKey = process.env.REMOVE_BG_API_KEY;
  if (!removeBgKey) {
    console.log("[cat-mascot] No REMOVE_BG_API_KEY, skipping background removal");
    return imageBase64;
  }

  try {
    console.log("[cat-mascot] Attempting background removal via remove.bg...");
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const imageBlob = new Blob([imageBuffer], { type: "image/png" });

    const formData = new FormData();
    formData.append("image_file", imageBlob, "image.png");
    formData.append("size", "auto");

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": removeBgKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("[cat-mascot] remove.bg API error:", response.status, errorText);
      return imageBase64;
    }

    const cleanImageBuffer = await response.arrayBuffer();
    const cleanBase64 = Buffer.from(cleanImageBuffer).toString("base64");
    console.log("[cat-mascot] Background removed successfully via remove.bg");
    return cleanBase64;
  } catch (error) {
    console.log("[cat-mascot] remove.bg fallback failed:", error);
    return imageBase64;
  }
}

export const catMascotRouter = createTRPCRouter({
  generate: publicProcedure
    .input(
      z.object({
        imageBase64: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        throw new Error("OPENAI_API_KEY is not configured on the server");
      }

      console.log(
        "[cat-mascot] Starting cat mascot generation, input length:",
        input.imageBase64.length
      );

      const prompt = `Convert this cat photo into a 16-bit pixel art sprite in the style of classic SNES / Super Nintendo era games.

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

      try {
        const cleanBase64 = input.imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(cleanBase64, "base64");
        const imageBlob = new Blob([imageBuffer], { type: "image/png" });

        const formData = new FormData();
        formData.append("image[]", imageBlob, "cat.png");
        formData.append("model", "gpt-image-1");
        formData.append("prompt", prompt);
        formData.append("size", "1024x1024");
        formData.append("quality", "medium");
        formData.append("background", "transparent");
        formData.append("output_format", "png");

        console.log("[cat-mascot] Sending multipart/form-data request to OpenAI...");

        const response = await fetch(
          "https://api.openai.com/v1/images/edits",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiKey}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.log("[cat-mascot] OpenAI API error:", response.status, errorText);
          throw new Error(`OpenAI error ${response.status}: ${errorText.slice(0, 400)}`);
        }

        const contentType = response.headers.get("content-type") || "";
        console.log("[cat-mascot] Response content-type:", contentType);

        let b64: string;

        if (contentType.includes("application/json")) {
          const rawText = await response.text();
          console.log("[cat-mascot] JSON response (first 200):", rawText.slice(0, 200));

          let data: any;
          try {
            data = JSON.parse(rawText);
          } catch (parseErr: any) {
            console.log("[cat-mascot] JSON parse failed:", parseErr?.message);
            throw new Error(`JSON parse error. Raw: ${rawText.slice(0, 300)}`);
          }

          const jsonB64 = data?.data?.[0]?.b64_json;
          if (!jsonB64) {
            console.log("[cat-mascot] Unexpected response shape:", JSON.stringify(data).slice(0, 200));
            throw new Error("No b64_json in OpenAI response");
          }
          b64 = jsonB64;
        } else {
          console.log("[cat-mascot] Response is binary, converting to base64...");
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          b64 = buffer.toString("base64");
          console.log("[cat-mascot] Converted binary to base64, length:", b64.length);
        }

        if (!b64 || b64.length < 100) {
          throw new Error("Image data is empty or too small");
        }

        let finalBase64 = b64;
        finalBase64 = await removeBackground(finalBase64);

        console.log("[cat-mascot] Success, final b64 length:", finalBase64.length);
        return { imageBase64: finalBase64 };
      } catch (err: any) {
        console.log("[cat-mascot] Error:", err?.message ?? String(err));
        throw new Error(err?.message ?? "Failed to generate pixel art");
      }
    }),
});
