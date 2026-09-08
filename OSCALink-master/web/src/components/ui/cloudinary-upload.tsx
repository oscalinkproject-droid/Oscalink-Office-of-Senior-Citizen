"use client";

import { useState, useCallback } from "react";

interface UploadedFile {
  id: string;
  url: string;
  name: string;
  type: string;
}

interface CloudinaryUploadProps {
  seniorId: string;
  onUpload?: (file: UploadedFile) => void;
  existingFiles?: UploadedFile[];
  compact?: boolean;
}

export function CloudinaryUpload({ seniorId, onUpload, existingFiles = [], compact = false }: CloudinaryUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "oscalink_scans";

  const handleUpload = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (!cloudName) {
      console.error("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set");
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);
        formData.append("folder", `seniors/${seniorId}`);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          { method: "POST", body: formData }
        );

        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
        const data = await res.json();

        const uploaded: UploadedFile = {
          id: data.public_id,
          url: data.secure_url,
          name: file.name,
          type: data.resource_type,
        };

        setFiles((prev) => [...prev, uploaded]);
        onUpload?.(uploaded);
      }
    } catch (err) {
      console.error("Cloudinary upload error:", err);
    } finally {
      setUploading(false);
    }
  }, [cloudName, uploadPreset, seniorId, onUpload]);

  if (compact) {
    return (
      <label className="flex items-center gap-2 px-3 py-2 bg-surface-high/40 border border-white/5 rounded-lg cursor-pointer hover:border-primary/20 hover:bg-white/[0.02] transition-all text-xs text-slate-400 hover:text-primary">
        <span className="material-symbols-outlined text-sm">
          {uploading ? "sync" : "attach_file"}
        </span>
        {uploading ? "Uploading..." : "Upload Scan"}
        <input
          type="file"
          className="hidden"
          multiple
          accept="image/*,.pdf"
          onChange={(e) => handleUpload(e.target.files)}
          disabled={uploading}
        />
      </label>
    );
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer group ${
        dragOver
          ? "border-primary/50 bg-primary/5"
          : "border-white/5 hover:border-primary/20 hover:bg-white/[0.02]"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleUpload(e.dataTransfer.files);
      }}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.accept = "image/*,.pdf";
        input.onchange = () => handleFiles(input.files);
        input.click();

        function handleFiles(fl: FileList | null) {
          handleUpload(fl);
        }
      }}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Processing upload...</span>
        </div>
      ) : (
        <>
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-surface-high/60 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors text-2xl">
              cloud_upload
            </span>
          </div>
          <p className="text-sm text-slate-300 font-medium mb-1">Drop files here or click to browse</p>
          <p className="text-[10px] text-slate-600">Supports JPG, PNG, PDF — Max 10MB per file</p>
        </>
      )}

      {/* Uploaded files preview */}
      {files.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface-high rounded-lg ring-1 ring-white/5"
            >
              <span className="material-symbols-outlined text-primary text-sm">
                {f.type === "image" ? "image" : "description"}
              </span>
              <span className="text-[10px] text-slate-300 font-medium truncate max-w-[120px]">{f.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
