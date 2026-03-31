"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropUtils";
import { Edit2, Upload, X } from "lucide-react";

interface AvatarEditorProps {
  currentAvatarUrl?: string | null;
  userName: string;
  onUploadSuccess: (newUrl: string) => void;
}

export default function AvatarEditor({ currentAvatarUrl, userName, onUploadSuccess }: AvatarEditorProps) {
  const [file, setFile] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initial = userName ? userName.charAt(0).toUpperCase() : "?"; const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const src = URL.createObjectURL(e.target.files[0]);
      setFile(src);
    }
  };

  const onCropComplete = useCallback((croppedArea: unknown, croppedAreaPx: { x: number; y: number; width: number; height: number }) => {
    // @ts-expect-error setting typed pixel area
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  const uploadPhoto = async () => {
    if (!file || !croppedAreaPixels) return;
    try {
      setIsUploading(true);
      const croppedImageBlob = await getCroppedImg(file, croppedAreaPixels);

      if (!croppedImageBlob) throw new Error("Could not crop image");

      const photoFile = new File([croppedImageBlob], "avatar.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("file", photoFile);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      onUploadSuccess(data.avatarUrl);
      setFile(null);
    } catch (err) {
      console.error(err);
      alert("Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative inline-block group">
      <div
        className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden flex items-center justify-center border-4"
        style={{ borderColor: "var(--accent-primary)", backgroundColor: "var(--bg-input)" }}
      >
        {currentAvatarUrl ? (
          <img
            src={currentAvatarUrl}
            alt="User avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl font-bold" style={{ color: "var(--text-primary)" }}>{initial}</span>
        )}
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="absolute bottom-0 right-0 p-2 rounded-full shadow-lg text-white transition-transform hover:scale-110"
        style={{ backgroundColor: "var(--accent-primary)" }}
        title="Change avatar"
      >
        <Edit2 size={16} />
      </button>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {mounted && file && createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" style={{ backgroundColor: "var(--bg-card)" }}>
            <div className="relative w-full h-64 sm:h-80 bg-black/20">
              <Cropper
                image={file}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="p-4 space-y-4">
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setFile(null)}
                  className="flex-1 py-2 px-4 rounded-lg border flex items-center gap-2 justify-center"
                  style={{ borderColor: "var(--accent-border)", color: "var(--text-secondary)" }}
                >
                  <X size={16} /> Отмена
                </button>
                <button
                  onClick={uploadPhoto}
                  disabled={isUploading}
                  className="flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-white"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                >
                  {isUploading ? "Загрузка..." : <><Upload size={16} /> Сохранить</>}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
