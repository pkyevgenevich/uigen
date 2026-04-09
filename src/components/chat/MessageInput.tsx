"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useRef, useState } from "react";
import { Send, ImagePlus, X } from "lucide-react";

interface ImageAttachment {
  file: File;
  preview: string;
}

interface MessageInputProps {
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (
    e: FormEvent<HTMLFormElement>,
    options?: { experimental_attachments?: FileList }
  ) => void;
  isLoading: boolean;
}

export function MessageInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
}: MessageInputProps) {
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ImageAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        newImages.push({
          file,
          preview: URL.createObjectURL(file),
        });
      }
    }
    setImages((prev) => [...prev, ...newImages]);
    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() && images.length === 0) return;

    if (images.length > 0) {
      const dataTransfer = new DataTransfer();
      images.forEach((img) => dataTransfer.items.add(img.file));
      handleSubmit(e, {
        experimental_attachments: dataTransfer.files,
      });
      // Clean up previews
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);
    } else {
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="relative p-4 bg-white border-t border-neutral-200/60"
    >
      <div className="relative max-w-4xl mx-auto">
        {images.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {images.map((img, index) => (
              <div
                key={index}
                className="relative group w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 shadow-sm"
              >
                <img
                  src={img.preview}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-1 -right-1 p-0.5 rounded-full bg-neutral-800 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="relative">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe the React component you want to create..."
            disabled={isLoading}
            className="w-full min-h-[80px] max-h-[200px] pl-4 pr-24 py-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 focus:bg-white transition-all placeholder:text-neutral-400 text-[15px] font-normal shadow-sm"
            rows={3}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="p-2.5 rounded-lg transition-all hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Upload image"
            >
              <ImagePlus
                className={`h-4 w-4 ${isLoading ? "text-neutral-300" : "text-neutral-500"}`}
              />
            </button>
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && images.length === 0)}
              className="p-2.5 rounded-lg transition-all hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent group"
            >
              <Send
                className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${isLoading || (!input.trim() && images.length === 0) ? "text-neutral-300" : "text-blue-600"}`}
              />
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </form>
  );
}
