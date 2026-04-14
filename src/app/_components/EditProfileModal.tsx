"use client";

import { useState, useRef } from "react";
import { api } from "~/trpc/react";
import { Camera } from "lucide-react";
import Image from "next/image";
import { ImageCropperModal } from "./ImageCropperModal";
import { uploadToR2 } from "~/app/_lib/uploadToR2";

export function EditProfileModal({
  user,
  isOpen,
  onClose,
}: {
  user: {
    id: string;
    name: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    image: string | null;
    headerImage: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(user.name ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [location, setLocation] = useState(user.location ?? "");
  const [website, setWebsite] = useState(user.website ?? "");
  const [image, setImage] = useState(user.image ?? "");
  const [headerImage, setHeaderImage] = useState(user.headerImage ?? "");
  const [isUploading, setIsUploading] = useState(false);

  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<"avatar" | "header" | null>(null);
  const [croppedAvatarFile, setCroppedAvatarFile] = useState<File | null>(null);
  const [croppedHeaderFile, setCroppedHeaderFile] = useState<File | null>(null);

  const headerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const utils = api.useUtils();
  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.user.getProfile.invalidate({ userId: user.id });
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let newImageUrl = image;
      let newHeaderImageUrl = headerImage;

      if (croppedAvatarFile) {
        newImageUrl = await uploadToR2(croppedAvatarFile);
      }

      if (croppedHeaderFile) {
        newHeaderImageUrl = await uploadToR2(croppedHeaderFile);
      }

      updateProfile.mutate({
        name,
        bio,
        location,
        website,
        image: newImageUrl,
        headerImage: newHeaderImageUrl,
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Failed to upload images");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/20 bg-black p-4">
        <div className="mb-4 flex justify-between">
          <h2 className="text-xl font-bold">Edit Profile</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative mb-12">
            {/* Header Image */}
            <div className="relative h-32 w-full overflow-hidden bg-gray-800">
              {headerImage && (
                <Image
                  src={headerImage}
                  alt="Header Preview"
                  fill
                  className="object-cover opacity-75"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => headerInputRef.current?.click()}
                  className="rounded-full bg-black/50 p-2 hover:bg-black/70"
                >
                  <Camera className="h-6 w-6 text-white" />
                </button>
              </div>
              <input
                type="file"
                accept="image/*"
                ref={headerInputRef}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setCropImageSrc(URL.createObjectURL(e.target.files[0]));
                    setCropType("header");
                  }
                }}
              />
            </div>

            {/* Profile Image */}
            <div className="absolute -bottom-12 left-4">
              <div className="relative h-24 w-24 rounded-full border-4 border-black bg-gray-800">
                {image && (
                  <Image
                    src={image}
                    alt="Profile Preview"
                    width={96}
                    height={96}
                    className="h-full w-full rounded-full object-cover opacity-75"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="rounded-full bg-black/50 p-2 hover:bg-black/70"
                  >
                    <Camera className="h-5 w-5 text-white" />
                  </button>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  ref={avatarInputRef}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setCropImageSrc(URL.createObjectURL(e.target.files[0]));
                      setCropType("avatar");
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-bold text-gray-500">
              Name
            </label>
            <input
              type="text"
              className="w-full rounded border border-white/20 bg-transparent p-2 text-white outline-none focus:border-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-500">Bio</label>
            <textarea
              className="w-full resize-none rounded border border-white/20 bg-transparent p-2 text-white outline-none focus:border-blue-500"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-500">
              Location
            </label>
            <input
              type="text"
              className="w-full rounded border border-white/20 bg-transparent p-2 text-white outline-none focus:border-blue-500"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-500">
              Website
            </label>
            <input
              type="text"
              className="w-full rounded border border-white/20 bg-transparent p-2 text-white outline-none focus:border-blue-500"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateProfile.isPending || isUploading}
              className="rounded-full bg-white px-4 py-2 font-bold text-black hover:bg-white/90 disabled:opacity-50"
            >
              {updateProfile.isPending || isUploading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>

      {cropImageSrc && cropType && (
        <ImageCropperModal
          imageUrl={cropImageSrc}
          aspect={cropType === "avatar" ? 1 : 3}
          onCancel={() => {
            setCropImageSrc(null);
            setCropType(null);
            if (avatarInputRef.current) avatarInputRef.current.value = "";
            if (headerInputRef.current) headerInputRef.current.value = "";
          }}
          onCropComplete={(file) => {
            if (cropType === "avatar") {
              setCroppedAvatarFile(file);
              setImage(URL.createObjectURL(file));
            } else {
              setCroppedHeaderFile(file);
              setHeaderImage(URL.createObjectURL(file));
            }
            setCropImageSrc(null);
            setCropType(null);
          }}
        />
      )}
    </div>
  );
}
