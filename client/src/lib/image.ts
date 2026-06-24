// Reads a File into raw base64 (no data: prefix) + its mime type, ready to send
// to the tRPC try-on / image-search procedures.
export function fileToBase64(file: File): Promise<{ b64Json: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // data:<mime>;base64,<data>
      const comma = result.indexOf(",");
      resolve({
        b64Json: comma >= 0 ? result.slice(comma + 1) : result,
        mimeType: file.type || "image/jpeg",
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
