// Server-side image compression for product uploads. Resizes oversized images
// and re-encodes to WebP (~q80) so each stored image is a few hundred KB rather
// than several MB — multiplying how many fit in the blob store.
//
// sharp is a native module, imported lazily and fully guarded: if it's
// unavailable or processing fails, we return null and the caller stores the
// original file, so an upload can never break because of compression.
export async function compressImage(
  input: Buffer,
  mimeType: string,
): Promise<{ buffer: Buffer; ext: string; contentType: string } | null> {
  try {
    const sharp = (await import("sharp")).default;
    const animated = mimeType.toLowerCase() === "image/gif";
    const out = await sharp(input, { animated })
      .rotate() // honour EXIF orientation
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    // Keep the original if WebP didn't actually shrink it (e.g. tiny images).
    if (out.length >= input.length) return null;
    return { buffer: out, ext: "webp", contentType: "image/webp" };
  } catch (err) {
    console.warn("[image] compression skipped:", String((err as Error)?.message || err).slice(0, 140));
    return null;
  }
}
