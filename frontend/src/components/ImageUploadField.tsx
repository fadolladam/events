import React, { useRef, useState } from 'react';
import { uploadImage } from '../services/api';
import { UploadCloud, Link2, X, Loader2 } from 'lucide-react';

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  folder?: 'event-covers' | 'event-banners';
  helpText?: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  value,
  onChange,
  folder = 'event-covers',
  helpText,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG, WEBP or GIF).');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image is too large — maximum size is 5 MB.');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadImage(file, folder);
      onChange(url);
    } catch (err: any) {
      setError(
        err?.response?.data?.errors?.file?.[0] ||
          err?.response?.data?.message ||
          'Upload failed. Please try again.'
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {/* Drop zone / upload trigger */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed px-4 py-4 text-xs font-semibold cursor-pointer transition-colors ${
          dragOver
            ? 'border-indigo-400 bg-indigo-50/60 text-indigo-600'
            : 'border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading…</span>
          </>
        ) : (
          <>
            <UploadCloud className="w-4 h-4" />
            <span>Upload from device or drag &amp; drop</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {/* Or paste a URL */}
      <div className="relative">
        <Link2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="url"
          placeholder="…or paste an image link (https://)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {error && <p className="text-[11px] font-medium text-red-600">{error}</p>}

      {value.trim() ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Cover preview"
            className="h-28 w-full max-w-xs rounded-xl object-cover border border-slate-200"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 p-1 rounded-full bg-white border border-slate-300 text-slate-500 hover:text-red-600 shadow-sm"
            title="Remove image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        helpText && <p className="text-[10px] text-slate-400">{helpText}</p>
      )}
    </div>
  );
};
