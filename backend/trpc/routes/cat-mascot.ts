import * as z from "zod";

import { createTRPCRouter, publicProcedure } from "../create-context";

async function removeBackground(imageBase64: string): Promise<string> {
  const removeBgKey = process.env.REMOVE_BG_API_KEY;
  if (!removeBgKey) {
    console.log("REMOVE_BG_API_KEY not set, skipping background removal");
    return imageBase64;
  }

  try {
    console.log("Sending image to remove.bg for background removal...");
    const imageBytes = Buffer.from(imageBase64, "base64");
    const formData = new FormData();
    formData.append(
      "image_file",
      new Blob([imageBytes], { type: "image/png" }),
      "mascot.png"
    );
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
      console.log("remove.bg API error:", response.status, errorText);
      return imageBase64;
    }

    const cleanImageBuffer = await response.arrayBuffer();
    const cleanBase64 = Buffer.from(cleanImageBuffer).toString("base64");
    console.log("Background removed successfully via remove.bg");
    return cleanBase64;
  } catch (error) {
    console.log("remove.bg fallback failed:", error);
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
        "Starting cat mascot generation, input length:",
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

      const imageBytes = Buffer.from(input.imageBase64, "base64");
      const formData = new FormData();
      formData.append(
        "image",
        new Blob([imageBytes], { type: "image/png" }),
        "cat.png"
      );
      formData.append("model", "gpt-image-1");
      formData.append("prompt", prompt);
      formData.append("size", "1024x1024");
      formData.append("quality", "medium");
      formData.append("background", "transparent");
      formData.append("response_format", "b64_json");

      console.log("Sending multipart/form-data request to OpenAI images/edits...");

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
        console.log("OpenAI API error:", errorText);
        throw new Error("Failed to generate pixel art from OpenAI");
      }

      const data = await response.json();
      console.log("OpenAI response received");

      if (!data.data?.[0]?.b64_json) {
        console.log(
          "Unexpected OpenAI response shape:",
          JSON.stringify(data).slice(0, 200)
        );
        throw new Error("No image data in OpenAI response");
      }

      let finalBase64 = data.data[0].b64_json as string;

      finalBase64 = await removeBackground(finalBase64);

      return {
        imageBase64: finalBase64,
      };
    }),
});
