import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

export const catMascotRouter = createTRPCRouter({
  generate: publicProcedure
    .input(z.object({ imageBase64: z.string() }))
    .mutation(async ({ input }) => {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        throw new Error("OPENAI_API_KEY is not configured");
      }

      const rawBase64 = input.imageBase64.replace(
        /^data:image\/[a-z]+;base64,/,
        ""
      );
      console.log("[cat-mascot] Base64 length:", rawBase64.length);

      const pixelArtPrompt = `Convert this cat photo into a 16-bit pixel art sprite in the style of classic SNES / Super Nintendo era games.

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
- NO realistic rendering — this must look like a 16-bit retro pixel art game character`;

      const imageBuffer = Buffer.from(rawBase64, "base64");
      const imageFile = new File([imageBuffer], "cat.png", {
        type: "image/png",
      });

      const form = new FormData();
      form.append("model", "gpt-image-1");
      form.append("image[]", imageFile);
      form.append("prompt", pixelArtPrompt);
      form.append("size", "1024x1024");
      form.append("quality", "low");

      console.log("[cat-mascot] Sending request to OpenAI /v1/images/edits...");

      let response: Response;
      try {
        response = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
          },
          body: form,
        });
      } catch (fetchErr: any) {
        console.log("[cat-mascot] Network error:", fetchErr?.message);
        throw new Error(`Network error: ${fetchErr?.message ?? "unknown"}`);
      }

      console.log("[cat-mascot] Response status:", response.status);

      let rawText: string;
      try {
        rawText = await response.text();
      } catch (readErr: any) {
        console.log("[cat-mascot] Failed to read body:", readErr?.message);
        throw new Error("Failed to read OpenAI response");
      }

      console.log(
        "[cat-mascot] Raw response (first 300):",
        rawText.slice(0, 300)
      );

      if (!response.ok) {
        console.log("[cat-mascot] API error:", response.status, rawText);
        throw new Error(
          `OpenAI error ${response.status}: ${rawText.slice(0, 400)}`
        );
      }

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr: any) {
        console.log("[cat-mascot] JSON parse failed:", parseErr?.message);
        console.log("[cat-mascot] Raw text:", rawText.slice(0, 500));
        throw new Error(
          `JSON parse error. Raw: ${rawText.slice(0, 300)}`
        );
      }

      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) {
        console.log(
          "[cat-mascot] No b64_json in response:",
          JSON.stringify(data).slice(0, 400)
        );
        throw new Error(
          `No image in response. Keys: ${Object.keys(data).join(", ")}`
        );
      }

      console.log("[cat-mascot] Success, b64 length:", b64.length);
      return { imageBase64: b64 as string };
    }),
});
