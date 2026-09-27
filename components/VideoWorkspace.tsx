'use client';

import React from 'react';
import {
  Play,
  Pause,
  Clock,
  Download,
  SkipBack,
  SkipForward,
  Repeat,
  CheckCircle2,
  Volume2,
  VolumeX,
  Film,
} from 'lucide-react';

interface VideoWorkspaceProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onStepFrame: (seconds: number) => void;
  outputVideoBlob: Blob | null;
  outputVideoUrl?: string | null;
  isProcessing: boolean;
  isCleaned?: boolean;
  isLooping: boolean;
  onToggleLoop: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onDownload?: () => void;
}

export function VideoWorkspace({
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  onStepFrame,
  outputVideoBlob,
  outputVideoUrl,
  isProcessing,
  isCleaned,
  isLooping,
  onToggleLoop,
  isMuted,
  onToggleMute,
  onDownload,
}: VideoWorkspaceProps) {
  const formatTime = (secs: number) => {
    const safeSecs = Math.max(0, secs);
    const m = Math.floor(safeSecs / 60);
    const s = Math.floor(safeSecs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const fileSizeMb = outputVideoBlob ? (outputVideoBlob.size / (1024 * 1024)).toFixed(2) : null;

  return (
    <div className="w-full bg-[#18181b] border-t border-[#27272a] px-4 py-3 flex flex-col gap-2.5">
      {/* Upper Control Row: Play/Pause, Scrubber, Timecode */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Playback buttons */}
        <div className="flex items-center gap-2">
          {/* Step Back Frame */}
          <button
            type="button"
            onClick={() => onStepFrame(-0.1)}
            disabled={isProcessing}
            className="p-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-zinc-300 rounded-lg transition-colors disabled:opacity-40"
            title="Step back 0.1s"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Play/Pause */}
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={isProcessing}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-all disabled:opacity-40 cursor-pointer"
            title={isPlaying ? 'Pause Video' : 'Play Video'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Step Forward Frame */}
          <button
            type="button"
            onClick={() => onStepFrame(0.1)}
            disabled={isProcessing}
            className="p-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-zinc-300 rounded-lg transition-colors disabled:opacity-40"
            title="Step forward 0.1s"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Time Display */}
          <div className="flex items-center gap-1.5 font-mono text-zinc-300 ml-1 text-xs">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>{formatTime(Math.min(currentTime, duration))}</span>
            <span className="text-zinc-600">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Video Scrubber Slider */}
        <div className="flex-1 w-full flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.02}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            disabled={isProcessing}
            className="w-full accent-indigo-500 cursor-pointer h-2 bg-[#27272a] rounded-lg"
          />
        </div>

        {/* Loop & Mute Options */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleLoop}
            className={`p-1.5 rounded-lg transition-colors ${
              isLooping
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#27272a]'
            }`}
            title="Toggle Loop"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#27272a] rounded-lg transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Helpful Hint / Output Status */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
        <span>
          💡 ভিডিও পজ করুন এবং উপরে ব্রাশ দিয়ে ওয়াটারমার্কের ওপর দাগ দিন (Pause & brush over watermark).
        </span>
        {outputVideoUrl && (
          <span className="text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> ওয়াটারমার্ক রিমুভ সম্পন্ন হয়েছে! ({fileSizeMb} MB)
          </span>
        )}
      </div>

      {/* Processed Video Ready Player & Download Banner */}
      {outputVideoUrl && (
        <div className="p-3 bg-[#121212] border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
          {/* Mini Video Preview Player in footer */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 bg-black flex-shrink-0">
              <video
                src={outputVideoUrl}
                playsInline
                autoPlay
                muted
                loop
                controls
                className="w-36 h-20 object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Restored Video Preview
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                ভিডিওতে আর কোনো ওয়াটারমার্ক নেই। এখন ডাউনলোড করুন।
              </p>
            </div>
          </div>

          {/* Download Action */}
          <a
            href={outputVideoUrl}
            download="watermark_removed_video.webm"
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer w-full sm:w-auto justify-center"
          >
            <Download className="w-4 h-4" />
            <span>Download Clean Video ({fileSizeMb} MB)</span>
          </a>
        </div>
      )}
    </div>
  );
}
