import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

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

        const imageBytes = Uint8Array.from(atob(cleanBase64), (ch) => ch.charCodeAt(0));
        const isPng = cleanBase64.startsWith("iVBOR");
        const mimeType = isPng ? "image/png" : "image/jpeg";
        const fileName = isPng ? "cat.png" : "cat.jpg";

        const blob = new Blob([imageBytes], { type: mimeType });

        const formData = new FormData();
        formData.append("image", blob, fileName);
        formData.append("model", "gpt-image-1");
        formData.append("prompt", prompt);
        formData.append("size", "1024x1024");
        formData.append("quality", "medium");
        formData.append("response_format", "b64_json");

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

        console.log("[cat-mascot] OpenAI status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.log("[cat-mascot] OpenAI API error:", response.status, errorText.slice(0, 500));
          throw new Error(`OpenAI error ${response.status}: ${errorText.slice(0, 400)}`);
        }

        const contentType = response.headers.get("content-type") || "";
        console.log("[cat-mascot] Response content-type:", contentType);

        let b64: string;

        if (contentType.includes("application/json")) {
          const data = await response.json() as { data?: { b64_json?: string; url?: string }[] };

          const b64Json = data?.data?.[0]?.b64_json;
          const url = data?.data?.[0]?.url;

          if (b64Json) {
            b64 = b64Json;
          } else if (url) {
            console.log("[cat-mascot] Got URL response, downloading...");
            const imgResponse = await fetch(url);
            const imgBuffer = await imgResponse.arrayBuffer();
            const imgBytes = new Uint8Array(imgBuffer);
            let imgBinary = "";
            for (let i = 0; i < imgBytes.length; i++) {
              imgBinary += String.fromCharCode(imgBytes[i]);
            }
            b64 = btoa(imgBinary);
          } else {
            throw new Error("No image data in OpenAI response");
          }
        } else {
          console.log("[cat-mascot] Binary response, converting to base64...");
          const arrayBuffer = await response.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          b64 = btoa(binary);
        }

        if (!b64 || b64.length < 100) {
          throw new Error("Image data is empty or too small");
        }

        console.log("[cat-mascot] Success, final b64 length:", b64.length);
        return { imageBase64: b64 };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.log("[cat-mascot] Error:", message);
        throw new Error(message || "Failed to generate pixel art");
      }
    }),
});
