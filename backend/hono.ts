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
  return c.json({ status: "ok", message: "CalBuddy API is running", version: "1.1", ts: Date.now() });
});

app.post("/generate-mascot", async (c) => {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
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

    console.log("[generate-mascot] Calling OpenAI images/edits...");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    const responseText = await response.text();
    console.log("[generate-mascot] OpenAI status:", response.status);
    console.log("[generate-mascot] OpenAI response (first 300):", responseText.slice(0, 300));

    if (!response.ok) {
      return c.json({ error: `OpenAI error ${response.status}: ${responseText.slice(0, 400)}` }, 500);
    }

    let b64: string;
    try {
      const data = JSON.parse(responseText);
      const jsonB64 = data?.data?.[0]?.b64_json;
      if (!jsonB64) {
        console.log("[generate-mascot] No b64_json found, keys:", Object.keys(data));
        return c.json({ error: "No b64_json in OpenAI response" }, 500);
      }
      b64 = jsonB64;
    } catch {
      console.log("[generate-mascot] JSON parse failed, treating as binary");
      const binaryResponse = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}` },
        body: formData,
      });
      const arrayBuffer = await binaryResponse.arrayBuffer();
      b64 = Buffer.from(arrayBuffer).toString("base64");
    }

    if (!b64 || b64.length < 100) {
      return c.json({ error: "Generated image data is empty or too small" }, 500);
    }

    console.log("[generate-mascot] Success, b64 length:", b64.length);
    return c.json({ imageBase64: b64 });
  } catch (err: any) {
    console.log("[generate-mascot] Unhandled error:", err?.message ?? String(err));
    return c.json({ error: err?.message ?? "Failed to generate pixel art" }, 500);
  }
});

export default app;
