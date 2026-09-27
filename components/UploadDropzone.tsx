'use client';

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Video,
  Image as ImageIcon,
  Layers,
  ArrowRight,
  Info,
  FolderOpen,
  Sparkles,
  PlusCircle,
} from 'lucide-react';

export type ActiveTabType = 'clean' | 'overlay' | 'batch';

interface UploadDropzoneProps {
  mode?: 'local' | 'ai';
  onToggleMode?: (mode: 'local' | 'ai') => void;
  onImageSelected: (dataUrl: string, fileName: string) => void;
  onVideoSelected: (videoUrl: string, file: File) => void;
  onBatchVideosSelected: (files: File[]) => void;
  onOpenOverlayMode?: (media: { type: 'image' | 'video'; src: string; name: string; file?: File }) => void;
  activeTab?: ActiveTabType;
  onTabChange?: (tab: ActiveTabType) => void;
}

export function UploadDropzone({
  mode = 'ai',
  onImageSelected,
  onVideoSelected,
  onBatchVideosSelected,
  onOpenOverlayMode,
  activeTab = 'clean',
  onTabChange,
}: UploadDropzoneProps) {
  const [selectedCategory, setSelectedCategory] = useState<ActiveTabType>(activeTab);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const currentTab = onTabChange ? activeTab : selectedCategory;

  const handleSelectTab = (tab: ActiveTabType) => {
    setSelectedCategory(tab);
    onTabChange?.(tab);
  };

  const handleFiles = (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const videoFiles = fileArray.filter((f) => f.type.startsWith('video/'));
    const imageFiles = fileArray.filter((f) => f.type.startsWith('image/'));

    if (currentTab === 'overlay') {
      // Open Overlay Studio
      if (videoFiles.length > 0) {
        const file = videoFiles[0];
        const url = URL.createObjectURL(file);
        onOpenOverlayMode?.({ type: 'video', src: url, name: file.name, file });
      } else if (imageFiles.length > 0) {
        const file = imageFiles[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            onOpenOverlayMode?.({ type: 'image', src: e.target.result as string, name: file.name, file });
          }
        };
        reader.readAsDataURL(file);
      }
    } else if (currentTab === 'batch' || videoFiles.length > 1) {
      const targetVideos = videoFiles.length > 0 ? videoFiles : fileArray;
      onBatchVideosSelected(targetVideos.slice(0, 10));
    } else if (imageFiles.length > 0 && videoFiles.length === 0) {
      const file = imageFiles[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onImageSelected(e.target.result as string, file.name);
        }
      };
      reader.readAsDataURL(file);
    } else {
      // Default single video
      const file = videoFiles[0] || fileArray[0];
      const url = URL.createObjectURL(file);
      onVideoSelected(url, file);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-10 pb-8 flex flex-col items-center justify-center">
      {/* 1. Header Typography */}
      <div className="text-center max-w-3xl mb-10 space-y-2">
        <p className="text-[11px] sm:text-xs font-mono font-bold tracking-[0.25em] text-zinc-400 uppercase">
          MAGICERASER
        </p>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Remove Watermarks <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-purple-400">
            with AI
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 font-normal pt-1">
          Remove logos, text, subtitles &amp; timestamps &mdash; no blur, no crop.
        </p>
      </div>

      {/* 2. Three Main Cards Grid */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-8">
        {/* Card 1: Remove Watermark from Video & Image */}
        <button
          type="button"
          onClick={() => handleSelectTab('clean')}
          className={`p-6 rounded-2xl text-left transition-all relative overflow-hidden flex flex-col justify-between h-42 cursor-pointer ${
            currentTab === 'clean'
              ? 'bg-[#181a2e]/90 border-2 border-purple-500 shadow-xl shadow-purple-900/20 ring-1 ring-purple-500/50'
              : 'bg-[#10141e]/80 border border-[#1e2538] hover:border-zinc-600 hover:bg-[#131926]'
          }`}
        >
          <div className="space-y-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                currentTab === 'clean'
                  ? 'bg-purple-600/25 text-purple-300 border border-purple-500/40'
                  : 'bg-[#1a2133] text-zinc-400 border border-[#27324c]'
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Remove Watermark <br /> from Image &amp; Video
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Clean your videos &amp; photos with AI.</p>
            </div>
          </div>
          <div className="self-end text-zinc-400 group-hover:text-white transition-colors">
            <ArrowRight className={`w-4 h-4 ${currentTab === 'clean' ? 'text-purple-400' : ''}`} />
          </div>
        </button>

        {/* Card 2: Add Overlay Media (PNG Logo, Image, or Video) */}
        <button
          type="button"
          onClick={() => handleSelectTab('overlay')}
          className={`p-6 rounded-2xl text-left transition-all relative overflow-hidden flex flex-col justify-between h-42 cursor-pointer ${
            currentTab === 'overlay'
              ? 'bg-[#181a2e]/90 border-2 border-purple-500 shadow-xl shadow-purple-900/20 ring-1 ring-purple-500/50'
              : 'bg-[#10141e]/80 border border-[#1e2538] hover:border-zinc-600 hover:bg-[#131926]'
          }`}
        >
          <div className="space-y-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                currentTab === 'overlay'
                  ? 'bg-purple-600/25 text-purple-300 border border-purple-500/40'
                  : 'bg-[#1a2133] text-zinc-400 border border-[#27324c]'
              }`}
            >
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Add Overlay Video <br /> &amp; PNG Image
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Add logo, PNG or video overlay on top.</p>
            </div>
          </div>
          <div className="self-end text-zinc-400">
            <ArrowRight className={`w-4 h-4 ${currentTab === 'overlay' ? 'text-purple-400' : ''}`} />
          </div>
        </button>

        {/* Card 3: Batch Remove (1 to 10 Videos) */}
        <button
          type="button"
          onClick={() => handleSelectTab('batch')}
          className={`p-6 rounded-2xl text-left transition-all relative overflow-hidden flex flex-col justify-between h-42 cursor-pointer ${
            currentTab === 'batch'
              ? 'bg-[#181a2e]/90 border-2 border-purple-500 shadow-xl shadow-purple-900/20 ring-1 ring-purple-500/50'
              : 'bg-[#10141e]/80 border border-[#1e2538] hover:border-zinc-600 hover:bg-[#131926]'
          }`}
        >
          <div className="space-y-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                currentTab === 'batch'
                  ? 'bg-purple-600/25 text-purple-300 border border-purple-500/40'
                  : 'bg-[#1a2133] text-zinc-400 border border-[#27324c]'
              }`}
            >
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Batch Remove
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Start multiple files <br /> at once (1-10 videos).
              </p>
            </div>
          </div>
          <div className="self-end text-zinc-400">
            <ArrowRight className={`w-4 h-4 ${currentTab === 'batch' ? 'text-purple-400' : ''}`} />
          </div>
        </button>
      </div>

      {/* 3. Upload Container with Top Info Bar and Dashed Dropzone */}
      <div className="w-full bg-[#0d111a] border border-[#1b2234] rounded-3xl p-5 sm:p-7 shadow-2xl">
        {/* Top Header of the Dropzone Box */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#1b2234]/90 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              {currentTab === 'clean' && <Sparkles className="w-4 h-4" />}
              {currentTab === 'overlay' && <PlusCircle className="w-4 h-4" />}
              {currentTab === 'batch' && <Layers className="w-4 h-4" />}
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white">
              {currentTab === 'clean' && 'Remove Watermark from Image & Video'}
              {currentTab === 'overlay' && 'Add Overlay Video or PNG Logo (Upload Base Media)'}
              {currentTab === 'batch' && 'Batch Video Watermark Removal (1-10 Files)'}
            </h2>
          </div>

          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-zinc-400">
            <div className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {currentTab === 'clean'
                  ? 'Supports Video & Image files'
                  : currentTab === 'overlay'
                  ? 'Supports Base MP4, WebM, PNG, JPG'
                  : 'Supports MP4, WebM, MOV, M4V'}
              </span>
            </div>
            <span className="text-zinc-600">|</span>
            <span>
              {currentTab === 'batch'
                ? 'Up to 10 Videos'
                : currentTab === 'overlay'
                ? 'PNG Logo / Video PIP'
                : 'Up to 100MB'}
            </span>
          </div>
        </div>

        {/* Inner Dashed Drag & Drop Area */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full py-12 sm:py-16 px-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center relative ${
            isDragging
              ? 'border-purple-500 bg-purple-500/10 scale-[1.008]'
              : 'border-[#222b40] bg-[#090d16]/70 hover:border-purple-500/50 hover:bg-[#0c1220]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple={currentTab === 'batch'}
            accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFiles(e.target.files);
              }
            }}
          />

          {/* Cloud Upload Icon */}
          <div className="w-14 h-14 rounded-2xl bg-purple-600/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-5 shadow-lg shadow-purple-900/30 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-7 h-7 text-purple-300" />
          </div>

          {/* Action Select Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2 mb-3"
          >
            <FolderOpen className="w-4 h-4" />
            <span>
              {currentTab === 'clean' && 'Select Video or Image'}
              {currentTab === 'overlay' && 'Select Base Media (Video or Image)'}
              {currentTab === 'batch' && 'Select Videos (1-10)'}
            </span>
          </button>

          {/* Drop text */}
          <p className="text-xs text-zinc-400 font-normal">
            {currentTab === 'clean' && 'or drag and drop your video or image here'}
            {currentTab === 'overlay' && 'or drag and drop your base video/image to add overlays on top'}
            {currentTab === 'batch' && 'or drag and drop up to 10 videos here'}
          </p>
        </div>
      </div>
    </div>
  );
}
