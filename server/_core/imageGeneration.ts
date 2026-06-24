/**
 * Image generation helper using internal ImageService
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 *
 * For editing:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "Add a rainbow to this landscape",
 *     originalImages: [{
 *       url: "https://example.com/original.jpg",
 *       mimeType: "image/jpeg"
 *     }]
 *   });
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  // Prefer Gemini's native image model when a Gemini key is configured.
  if (ENV.geminiApiKey) {
    return generateImageGemini(options);
  }

  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  // Build the full URL by appending the service path to the base URL
  const baseUrl = ENV.forgeApiUrl.endsWith("/")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL(
    "images.v1.ImageService/GenerateImage",
    baseUrl
  ).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      prompt: options.prompt,
      original_images: options.originalImages || [],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    image: {
      b64Json: string;
      mimeType: string;
    };
  };
  const base64Data = result.image.b64Json;
  const buffer = Buffer.from(base64Data, "base64");

  // Save to S3
  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    result.image.mimeType
  );
  return {
    url,
  };
}

const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

// Converts a reference image (remote URL or inline base64) into a Gemini
// inline_data part.
async function toInlineDataPart(img: {
  url?: string;
  b64Json?: string;
  mimeType?: string;
}): Promise<{ inline_data: { mime_type: string; data: string } } | null> {
  if (img.b64Json) {
    return {
      inline_data: { mime_type: img.mimeType || "image/png", data: img.b64Json },
    };
  }
  if (img.url) {
    const resp = await fetch(img.url);
    if (!resp.ok) return null;
    const mime = img.mimeType || resp.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await resp.arrayBuffer());
    return { inline_data: { mime_type: mime, data: buf.toString("base64") } };
  }
  return null;
}

// Generates/edits an image with Gemini 2.5 Flash Image ("nano banana").
async function generateImageGemini(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const parts: any[] = [{ text: options.prompt }];
  for (const img of options.originalImages || []) {
    const part = await toInlineDataPart(img);
    if (part) parts.push(part);
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;

  // Retry transient 503s (model overloaded) a couple of times.
  let response: Response | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": ENV.geminiApiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    });
    if (response.status !== 503 || attempt === 3) break;
    await new Promise(r => setTimeout(r, 3000 * attempt));
  }

  if (!response || !response.ok) {
    const detail = response ? await response.text().catch(() => "") : "";
    // Free-tier image generation quota is 0 — surface an actionable message.
    if (response?.status === 429 || /RESOURCE_EXHAUSTED|free_tier/i.test(detail)) {
      throw new Error(
        "Virtual try-on needs Gemini image generation, which isn't on the free tier. Enable billing on your Google AI project (Nano Banana is ~$0.04/image) to turn this on."
      );
    }
    throw new Error(
      `Gemini image generation failed (${response?.status} ${response?.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as any;
  const candidateParts: any[] = result?.candidates?.[0]?.content?.parts || [];
  const imagePart = candidateParts.find(p => p.inlineData || p.inline_data);
  const inline = imagePart?.inlineData || imagePart?.inline_data;

  if (!inline?.data) {
    const textPart = candidateParts.find(p => p.text)?.text;
    throw new Error(
      `Gemini returned no image${textPart ? `: ${textPart}` : ""}`
    );
  }

  const buffer = Buffer.from(inline.data, "base64");
  const mimeType = inline.mimeType || inline.mime_type || "image/png";
  const { url: storedUrl } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    mimeType
  );
  return { url: storedUrl };
}
