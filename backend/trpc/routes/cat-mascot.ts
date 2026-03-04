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
      console.log("[cat-mascot] Content-Type:", response.headers.get("content-type"));

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        let errorText: string;
        try {
          errorText = await response.text();
        } catch {
          errorText = "Could not read error body";
        }
        console.log("[cat-mascot] API error:", response.status, errorText);
        throw new Error(`OpenAI error ${response.status}: ${errorText.slice(0, 400)}`);
      }

      let b64: string;

      if (contentType.includes("application/json")) {
        console.log("[cat-mascot] Response is JSON");
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
          throw new Error(`No b64_json in response. Keys: ${JSON.stringify(Object.keys(data))}`);
        }
        b64 = jsonB64;
      } else {
        console.log("[cat-mascot] Response is binary, converting to base64...");
        try {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          b64 = buffer.toString("base64");
          console.log("[cat-mascot] Converted binary to base64, length:", b64.length);
        } catch (binErr: any) {
          console.log("[cat-mascot] Binary read error:", binErr?.message);
          throw new Error(`Failed to read binary response: ${binErr?.message}`);
        }
      }

      if (!b64 || b64.length < 100) {
        throw new Error("Image data is empty or too small");
      }

      console.log("[cat-mascot] Success, b64 length:", b64.length);
      return { imageBase64: b64 };
    }),
});
