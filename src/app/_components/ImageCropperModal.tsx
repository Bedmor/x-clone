"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

export function ImageCropperModal({
  imageUrl,
  aspect,
  onCropComplete,
  onCancel,
}: {
  imageUrl: string;
  aspect: number;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropCompleteCallback = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const createCrop = async () => {
    if (!croppedAreaPixels) return;

    try {
      const image = await createImage(imageUrl);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
      );

      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
        onCropComplete(file);
      }, "image/jpeg");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex h-full max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/20 bg-black">
        <div className="flex items-center justify-between border-b border-white/20 p-4">
          <h2 className="text-xl font-bold">Crop Image</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-white">
            ✕
          </button>
        </div>
        <div className="relative min-h-[300px] flex-1 bg-gray-900">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteCallback}
            onZoomChange={setZoom}
          />
        </div>
        <div className="flex items-center justify-between border-t border-white/20 p-4">
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-1/2"
          />
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="rounded-full border border-white/20 px-4 py-2 font-bold hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={createCrop}
              className="rounded-full bg-white px-4 py-2 font-bold text-black hover:bg-gray-200"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) =>
      reject(
        error instanceof Error ? error : new Error("Failed to load image"),
      ),
    );
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
