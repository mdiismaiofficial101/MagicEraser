'use client';

import React, { useState } from 'react';
import {
  UploadCloud,
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Film,
  Layers,
  Eye,
  Sliders,
  ChevronDown,
  HelpCircle,
  Video,
  FileCheck2,
  Lock,
  ArrowRight,
  Maximize2,
} from 'lucide-react';

interface LandingContentProps {
  onOpenUpload: () => void;
}

export function LandingContent({ onOpenUpload }: LandingContentProps) {
  // Split slider for interactive demo
  const [sliderPos, setSliderPos] = useState(50);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does Magic Eraser remove watermarks without blurring or cropping?',
      a: 'Unlike traditional tools that simply blur, pixelate, or crop out the edges of your video, Magic Eraser uses deep learning AI inpainting. It analyzes the surrounding pixels across the video frames and mathematically reconstructs the original texture, lighting, and gradients, making the watermark disappear seamlessly.',
    },
    {
      q: 'Can I upload multiple videos at once?',
      a: 'Yes! You can upload from 1 up to 10 videos in batch. The sequential upload order is strictly preserved. You can set the watermark selection on each video or click "Apply Box to All", then hit "One-Tap Remove All" to process all videos sequentially with 1 click.',
    },
    {
      q: 'Will the video speed, length, or quality change?',
      a: 'Not at all. We use hardware WebCodecs video encoding. A 5-second video stays exactly 5.0 seconds at 1.0x normal speed. No extra seconds are added, and no slow-motion occurs.',
    },
    {
      q: 'Will my video files be renamed?',
      a: 'No. Your original file names (e.g., video1.mp4, my_clip.mp4) are 100% preserved upon download.',
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12 space-y-20">
      {/* 1. How It Works (3 Steps) */}
      <section id="how-it-works" className="space-y-8 text-center scroll-mt-24">
        <div className="space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simple 3-Step Process</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
            How to Remove Watermark from Video Online
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Clean any video watermark, logo, or subtitle in seconds with AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Step 1 */}
          <div className="bg-[#111723] border border-[#222b3d] rounded-3xl p-7 flex flex-col justify-between hover:border-indigo-500/40 transition-all group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                01
              </div>
              <h3 className="text-lg font-bold text-white">Upload 1 to 10 Videos</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Click upload or drag & drop up to 10 videos (MP4, WebM, MOV). Sequential order is strictly preserved.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center gap-2 text-[11px] text-zinc-500">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Multi-video batch queue support</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-[#111723] border border-[#222b3d] rounded-3xl p-7 flex flex-col justify-between hover:border-purple-500/40 transition-all group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                02
              </div>
              <h3 className="text-lg font-bold text-white">Box or Brush Watermark</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Drag a resizable box marquee or brush over the logo. Use &ldquo;Apply Box to All&rdquo; for identical watermark positions.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center gap-2 text-[11px] text-zinc-500">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Smart box handles &amp; 1-click presets</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-[#111723] border border-[#222b3d] rounded-3xl p-7 flex flex-col justify-between hover:border-pink-500/40 transition-all group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-600/10 border border-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                03
              </div>
              <h3 className="text-lg font-bold text-white">One-Tap Erase &amp; Download</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Click &ldquo;One-Tap Remove All&rdquo;. AI reconstructs background frames. Download individually or as a single ZIP with original names.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center gap-2 text-[11px] text-zinc-500">
              <CheckCircle2 className="w-4 h-4 text-pink-400" />
              <span>Original names & 1.0x speed guaranteed</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Before & After Showcase */}
      <section className="bg-[#111723] border border-[#222b3d] rounded-3xl p-8 sm:p-12 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Eye className="w-3.5 h-3.5" />
              <span>See the Magic in Action</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Before vs. After AI Watermark Eraser
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Drag the interactive slider below to see how AI seamlessly erases unwanted watermark stamps without blurring the underlying video scene.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenUpload}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Video Now</span>
            </button>
          </div>
        </div>

        {/* Interactive Split Slider Container */}
        <div className="relative w-full h-80 sm:h-[420px] rounded-3xl overflow-hidden border border-zinc-700/60 select-none bg-zinc-950 shadow-2xl">
          {/* Base Layer: BEFORE (Photo with Watermark stamps) */}
          <div className="absolute inset-0 w-full h-full">
            {/* Real Nature Photo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/nature_showcase.jpg"
              alt="Nature Landscape Before Watermark Removal"
              className="w-full h-full object-cover"
            />
            {/* Watermark Overlay on Before side */}
            <div className="absolute inset-0 bg-black/10 flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[11px] font-mono text-zinc-300 border border-white/10">
                  4K UHD • 60 FPS
                </span>
                <span className="text-xs text-rose-300 font-bold px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/50 shadow-lg">
                  BEFORE (With Watermark)
                </span>
              </div>

              {/* Center Watermark Stamp */}
              <div className="self-center text-center px-4 py-2 bg-black/40 backdrop-blur-xs rounded-xl border border-white/20">
                <p className="text-sm sm:text-base font-black tracking-widest text-white/70 uppercase">
                  © 4K_NATURE_STUDIO • SAMPLE
                </p>
              </div>

              {/* Corner Watermark */}
              <div className="flex items-end justify-between">
                <span className="text-[11px] font-mono text-zinc-200 bg-black/60 px-2 py-0.5 rounded">
                  2026-09-27 15:42
                </span>
                <div className="px-3.5 py-1.5 bg-red-600/80 backdrop-blur-md rounded-xl text-white font-black text-xs sm:text-sm tracking-wider shadow-xl border border-red-400/60">
                  @WATERMARK_SAMPLE
                </div>
              </div>
            </div>
          </div>

          {/* Layer: AFTER (Cleaned Photo with NO Watermark) */}
          <div
            className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
            style={{
              clipPath: `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)`,
            }}
          >
            {/* Real Pristine Nature Photo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/nature_showcase.jpg"
              alt="Nature Landscape Cleaned After AI Removal"
              className="w-full h-full object-cover"
            />
            {/* Clean Badges on After side */}
            <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[11px] font-mono text-zinc-300 border border-white/10">
                  4K UHD • 60 FPS
                </span>
                <span className="text-xs text-emerald-300 font-bold px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/50 shadow-lg flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  AFTER (AI Cleaned ✨)
                </span>
              </div>

              <div className="flex items-end justify-end">
                <div className="px-3 py-1 bg-emerald-500/20 backdrop-blur-md rounded-xl text-emerald-300 font-semibold text-xs border border-emerald-400/40">
                  100% Watermark Free
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Split Drag Divider */}
          <div
            className="absolute inset-y-0 w-1 bg-white cursor-ew-resize flex items-center justify-center -translate-x-1/2 z-30 shadow-2xl pointer-events-none"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="w-9 h-9 rounded-full bg-white text-zinc-900 shadow-2xl flex items-center justify-center font-bold text-xs ring-4 ring-indigo-500/60">
              ↔
            </div>
          </div>

          {/* Slider range input overlay */}
          <input
            type="range"
            min={0}
            max={100}
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-40"
            aria-label="Split slider comparison"
          />
        </div>
      </section>

      {/* 3. FAQ Section */}
      <section id="faq" className="space-y-8 scroll-mt-24">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3 max-w-3xl mx-auto">
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                className="bg-[#111723] border border-[#222b3d] rounded-2xl overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm text-zinc-200 hover:text-white"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform ${
                      isOpen ? 'rotate-180 text-indigo-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Bottom CTA */}
      <section className="text-center py-10 bg-gradient-to-r from-indigo-900/30 via-purple-900/30 to-pink-900/30 rounded-3xl border border-indigo-500/30 p-8 space-y-5">
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
          Ready to Remove Watermarks in Batch?
        </h2>
        <p className="text-xs sm:text-sm text-zinc-300 max-w-lg mx-auto">
          Upload up to 10 videos and clean them all in one single tap. 100% free with no watermark on output.
        </p>
        <button
          type="button"
          onClick={onOpenUpload}
          className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-bold rounded-2xl text-sm shadow-xl shadow-indigo-600/30 transition-all cursor-pointer inline-flex items-center gap-2 hover:scale-105"
        >
          <UploadCloud className="w-5 h-5" />
          <span>Upload Videos Now</span>
        </button>
      </section>
    </div>
  );
}
