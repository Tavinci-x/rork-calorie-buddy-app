import * as z from "zod";

import { createTRPCRouter, publicProcedure } from "../create-context";

export const catMascotRouter = createTRPCRouter({
  generate: publicProcedure
    .input(z.object({ imageBase64: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
          throw new Error("OPENAI_API_KEY is not configured on the server");
        }

        console.log("Starting cat mascot generation...");

        const rawBase64 = input.imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
        console.log("Base64 length after stripping prefix:", rawBase64.length);

        const prompt = `Convert this cat photo into a 16-bit pixel art sprite in the style of classic SNES / Super Nintendo era games.

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

        const requestBody = {
          model: "gpt-image-1",
          prompt: prompt,
          size: "1024x1024",
          quality: "medium",
          output_format: "b64_json",
          image: {
            type: "base64",
            media_type: "image/jpeg",
            data: rawBase64,
          },
        };

        console.log("Sending request to OpenAI /v1/images/generations...");

        let response: Response;
        try {
          response = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });
        } catch (fetchErr: any) {
          console.log("Fetch error:", fetchErr?.message || fetchErr);
          throw new Error(`Network error calling OpenAI: ${fetchErr?.message || "unknown"}`);
        }

        console.log("OpenAI response status:", response.status);
        console.log("OpenAI response headers content-type:", response.headers.get("content-type"));

        let rawText: string;
        try {
          rawText = await response.text();
          console.log("OpenAI raw response length:", rawText.length);
          console.log("OpenAI raw response (first 500 chars):", rawText.slice(0, 500));
        } catch (readErr: any) {
          console.log("Error reading response body:", readErr?.message || readErr);
          throw new Error(`Failed to read OpenAI response body: ${readErr?.message || "unknown"}`);
        }

        if (!response.ok) {
          console.log("OpenAI API error:", response.status, rawText.slice(0, 1000));
          throw new Error(`OpenAI API error ${response.status}: ${rawText.slice(0, 500)}`);
        }

        let data: any;
        try {
          data = JSON.parse(rawText);
        } catch (parseErr: any) {
          console.log("JSON parse error:", parseErr?.message);
          console.log("Raw response that failed to parse (first 1000 chars):", rawText.slice(0, 1000));
          throw new Error(`Failed to parse OpenAI response as JSON. First 300 chars of raw response: ${rawText.slice(0, 300)}`);
        }

        console.log("OpenAI parsed response keys:", Object.keys(data));

        if (!data.data?.[0]?.b64_json) {
          console.log("Unexpected OpenAI response structure:", JSON.stringify(data).slice(0, 500));
          throw new Error(`No image data in OpenAI response. Keys: ${Object.keys(data).join(", ")}. Response: ${JSON.stringify(data).slice(0, 300)}`);
        }

        console.log("Cat mascot generation successful, b64_json length:", data.data[0].b64_json.length);

        return {
          imageBase64: data.data[0].b64_json as string,
        };
      } catch (err: any) {
        console.log("Cat mascot generation failed:", err?.message || err);
        throw err;
      }
    }),
});
