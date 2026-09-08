"use client";

import { useState } from "react";

interface SimpleUploadProps {
  label: string;
  fieldName: string;
  accept?: string;
  icon?: string;
  currentUrl?: string | null;
}

export function SimpleCloudinaryUpload({ label, fieldName, accept = "image/*", icon = "upload_file", currentUrl }: SimpleUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [error, setError] = useState<string | null>(null);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "oscalink_scans";

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!cloudName) { setError("Cloudinary not configured"); return; }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.secure_url) {
        setPreview(data.secure_url);
        const hidden = document.getElementById(`upload-${fieldName}`) as HTMLInputElement;
        if (hidden) hidden.value = data.secure_url;
      } else {
        setError(data.error?.message || "Upload failed");
      }
    } catch {
      setError("Upload failed. Check your connection.");
    }
    setUploading(false);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-outline flex items-center gap-1.5">
        <span className="material-symbols-outlined text-xs">{icon}</span>
        {label}
      </label>
      <input type="hidden" name={fieldName} id={`upload-${fieldName}`} value={currentUrl || ""} />
      {preview ? (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-low border border-outline-variant/30">
          <img src={preview} alt="" className="w-10 h-10 rounded object-cover" />
          <span className="text-[10px] text-emerald-400 flex-1 truncate">Uploaded</span>
          <label className="text-[10px] text-primary font-bold cursor-pointer hover:underline">Change</label>
          <input type="file" accept={accept} onChange={handleFile} className="hidden" />
        </div>
      ) : (
        <label className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed cursor-pointer transition-all ${
          uploading ? 'border-primary/50 bg-primary/5 opacity-60' : 'border-outline-variant/30 hover:border-primary/40 hover:bg-surface-low'
        }`}>
          <span className="material-symbols-outlined text-outline text-sm">{uploading ? 'sync' : 'add_photo_alternate'}</span>
          <span className="text-[10px] text-outline">{uploading ? 'Uploading...' : `Upload ${label}`}</span>
          <input type="file" accept={accept} onChange={handleFile} disabled={uploading} className="hidden" />
        </label>
      )}
      {error && <p className="text-[9px] text-red-400">{error}</p>}
    </div>
  );
}
