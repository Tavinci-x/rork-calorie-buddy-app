import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

app.use("*", cors());

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "CalBuddy API is running", version: "1.2", ts: Date.now() });
});

app.post("/generate-mascot", async (c) => {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      console.log("[generate-mascot] OPENAI_API_KEY is missing");
      return c.json({ error: "OPENAI_API_KEY is not configured" }, 500);
    }

    const body = await c.req.json();
    const imageBase64 = body.imageBase64;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return c.json({ error: "imageBase64 is required" }, 400);
    }

    console.log("[generate-mascot] Starting, input length:", imageBase64.length);

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

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
- BACKGROUND MUST BE COMPLETELY TRANSPARENT
- Do NOT draw any floor, shadow, border, frame, or pattern behind the cat
- The cat should look cute and friendly with slightly oversized head (chibi proportions)
- NO realistic rendering — this must look like a 16-bit retro pixel art game character
- The pixel art cat should be immediately recognizable as the same cat from the photo`;

    const imageBytes = Uint8Array.from(atob(cleanBase64), (ch) => ch.charCodeAt(0));
    const isPng = cleanBase64.startsWith("iVBOR");
    const mimeType = isPng ? "image/png" : "image/jpeg";
    const fileName = isPng ? "cat.png" : "cat.jpg";

    const file = new File([imageBytes], fileName, { type: mimeType });

    const formData = new FormData();
    formData.append("image", file);
    formData.append("model", "gpt-image-1");
    formData.append("prompt", prompt);
    formData.append("size", "1024x1024");
    formData.append("quality", "medium");

    console.log("[generate-mascot] Calling OpenAI images/edits with model gpt-image-1...");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    console.log("[generate-mascot] OpenAI status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log("[generate-mascot] OpenAI error:", errorText.slice(0, 500));
      return c.json({ error: `OpenAI error ${response.status}: ${errorText.slice(0, 400)}` }, 500);
    }

    const contentType = response.headers.get("content-type") || "";
    console.log("[generate-mascot] Response content-type:", contentType);

    let b64: string;

    if (contentType.includes("application/json")) {
      const data = await response.json() as { data?: { b64_json?: string; url?: string }[] };
      console.log("[generate-mascot] Got JSON response");

      const b64Json = data?.data?.[0]?.b64_json;
      const url = data?.data?.[0]?.url;

      if (b64Json) {
        b64 = b64Json;
      } else if (url) {
        console.log("[generate-mascot] Got URL, downloading image...");
        const imgResponse = await fetch(url);
        const imgBuffer = await imgResponse.arrayBuffer();
        b64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
      } else {
        console.log("[generate-mascot] No image data in response:", JSON.stringify(data).slice(0, 300));
        return c.json({ error: "No image data in OpenAI response" }, 500);
      }
    } else {
      console.log("[generate-mascot] Binary response, converting to base64...");
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      b64 = btoa(binary);
    }

    if (!b64 || b64.length < 100) {
      return c.json({ error: "Generated image data is empty or too small" }, 500);
    }

    console.log("[generate-mascot] Success, b64 length:", b64.length);
    return c.json({ imageBase64: b64 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log("[generate-mascot] Unhandled error:", message);
    return c.json({ error: message || "Failed to generate pixel art" }, 500);
  }
});

export default app;