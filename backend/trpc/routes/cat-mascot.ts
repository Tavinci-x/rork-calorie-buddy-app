import * as z from "zod";

import { createTRPCRouter, publicProcedure } from "../create-context";

export const catMascotRouter = createTRPCRouter({
  generate: publicProcedure
    .input(z.object({ imageBase64: z.string() }))
    .mutation(async ({ input }) => {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        throw new Error("OPENAI_API_KEY is not configured on the server");
      }

      console.log("Starting cat mascot generation...");

      const imageBytes = Buffer.from(input.imageBase64, "base64");
      const imageBlob = new Blob([imageBytes], { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("image", imageBlob, "cat.jpg");
      formData.append("model", "gpt-image-1");
      formData.append("prompt", `Convert this cat photo into a 16-bit pixel art sprite in the style of classic SNES / Super Nintendo era games.

CRITICAL REQUIREMENTS:
- MUST preserve the exact fur colors and color distribution from the photo
- MUST preserve the cat's specific markings, patches, and patterns exactly as they appear
- MUST match the cat's eye color precisely
- MUST capture the cat's body proportions (slim, average, chubby)
- Style: 16-bit pixel art, 64x64 to 128x128 pixel aesthetic with richer detail than 8-bit
- Use a 16-bit color palette with smooth shading and subtle gradients
- The cat should be sitting upright in a cute front-facing pose
- BACKGROUND MUST BE COMPLETELY TRANSPARENT
- The cat should look cute and friendly with slightly oversized head (chibi proportions)
- NO realistic rendering — this must look like a 16-bit retro pixel art game character`);
      formData.append("size", "1024x1024");
      formData.append("quality", "medium");
      formData.append("output_format", "png");

      const response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("OpenAI API error:", response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("OpenAI response received");

      if (!data.data?.[0]?.b64_json) {
        console.log("Unexpected OpenAI response:", JSON.stringify(data).slice(0, 200));
        throw new Error("No image data in OpenAI response");
      }

      return {
        imageBase64: data.data[0].b64_json as string,
      };
    }),
});
