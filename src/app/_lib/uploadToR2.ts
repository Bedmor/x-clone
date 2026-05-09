export async function uploadToR2(
  file: File,
  options?: {
    onProgress?: (percent: number) => void;
    onStatus?: (status: string) => void;
  },
) {
  // If the file is an image, convert/resample it to WEBP on the client
  // to reduce upload size and improve delivery. Non-images are uploaded as-is.
  async function convertImageToWebp(input: File, maxDim = 1600, quality = 0.82) {
    try {
      // createImageBitmap works with File/Blob in modern browsers
      const bitmap = await createImageBitmap(input as Blob);

      let { width, height } = bitmap;

      // downscale if larger than maxDim (preserve aspect ratio)
      if (Math.max(width, height) > maxDim) {
        const ratio = maxDim / Math.max(width, height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      ctx.drawImage(bitmap, 0, 0, width, height);

      // Try webp first; fall back to jpeg if not supported
      const mimeTypes = ["image/webp", "image/jpeg"];

      for (const mime of mimeTypes) {
        try {
          const blob: Blob | null = await new Promise((resolve) =>
            // some browsers require callback style
            canvas.toBlob((b) => resolve(b), mime, quality),
          );

          if (blob && blob.size > 0) {
            const ext = mime === "image/webp" ? "webp" : "jpg";
            return new File([blob], `${input.name.replace(/\.[^.]+$/, "")}.${ext}`, {
              type: mime,
            });
          }
        } catch {
          // try next mime type
        }
      }

      // If conversion failed, return original
      return input;
    } catch {
      return input;
    }
  }

  const onProgress = options?.onProgress;
  const onStatus = options?.onStatus;

  let uploadFile: File = file;

  if (file.type.startsWith("image/")) {
    onStatus?.("converting");
    uploadFile = await convertImageToWebp(file);
  }

  onStatus?.("uploading");

  // Use XHR so we can report upload progress reliably
  const formData = new FormData();
  formData.append("file", uploadFile);

  const url = "/api/upload";

  const xhr = new XMLHttpRequest();

  const readStringField = (
    payload: unknown,
    field: "error" | "url",
  ): string | undefined => {
    if (!payload || typeof payload !== "object") return undefined;
    const value = (payload as Record<string, unknown>)[field];
    return typeof value === "string" ? value : undefined;
  };

  const uploadPromise = new Promise<string>((resolve, reject) => {
    xhr.open("POST", url, true);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        onProgress?.(pct);
      }
    };

    xhr.onload = () => {
      try {
        const ok = xhr.status >= 200 && xhr.status < 300;
        let parsed: unknown = {};
        if (xhr.responseText) {
          try {
            parsed = JSON.parse(xhr.responseText);
          } catch {
            parsed = {};
          }
        }

        if (!ok) {
          // attempt to read error message from parsed payload
          const errMsg = readStringField(parsed, "error") ?? `Upload failed (${xhr.status})`;
          reject(new Error(errMsg));
          return;
        }

        const uploadedUrl = readStringField(parsed, "url");
        if (uploadedUrl) {
          resolve(uploadedUrl);
          return;
        }

        reject(new Error("Upload failed: invalid response"));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload aborted"));

    xhr.send(formData);
  });

  const result = await uploadPromise;
  onStatus?.("done");
  onProgress?.(100);
  return result;
}
