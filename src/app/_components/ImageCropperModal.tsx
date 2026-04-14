"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { RotateCcw, RotateCw } from "lucide-react";

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
  const [rotation, setRotation] = useState(0);
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
      const blob = await getCroppedImage(imageUrl, croppedAreaPixels, rotation);
      const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
      onCropComplete(file);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex h-full max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/20 bg-black">
        <div className="flex items-center justify-between border-b border-white/20 p-4">
          <h2 className="text-xl font-bold">Crop Image</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-white">
            ✕
          </button>
        </div>
        <div className="relative min-h-75 flex-1 bg-gray-900">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteCallback}
            onZoomChange={setZoom}
          />
        </div>
        <div className="flex items-center justify-between border-t border-white/20 p-4">
          <div className="flex items-center gap-3">
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-40"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRotation((current) => current - 90)}
                className="rounded-full border border-white/20 p-2 hover:bg-white/10"
                aria-label="Rotate left"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((current) => current + 90)}
                className="rounded-full border border-white/20 p-2 hover:bg-white/10"
                aria-label="Rotate right"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-white/20 px-4 py-2 font-bold hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
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

const getCroppedImage = async (
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to create canvas context");
  }

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));
  const rotatedSize = rotateSize(image.width, image.height, rotation);

  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");

  if (!croppedCtx) {
    throw new Error("Failed to create cropped canvas context");
  }

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas,
    safeArea / 2 - rotatedSize.width / 2 + pixelCrop.x,
    safeArea / 2 - rotatedSize.height / 2 + pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return await new Promise<Blob>((resolve, reject) => {
    croppedCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to crop image"));
        return;
      }

      resolve(blob);
    }, "image/jpeg");
  });
};

const rotateSize = (width: number, height: number, rotation: number) => {
  const rotationRad = (rotation * Math.PI) / 180;

  return {
    width:
      Math.abs(Math.cos(rotationRad) * width) +
      Math.abs(Math.sin(rotationRad) * height),
    height:
      Math.abs(Math.sin(rotationRad) * width) +
      Math.abs(Math.cos(rotationRad) * height),
  };
};

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
