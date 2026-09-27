'use client';

import React from 'react';
import {
  Sparkles,
  Zap,
  Download,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Package,
} from 'lucide-react';
import { VideoProcessingProgress } from '@/lib/video-processor';

interface ActionFooterProps {
  mode: 'local' | 'ai';
  hasMask: boolean;
  isProcessing: boolean;
  isProcessed: boolean;
  onProcess: () => void;
  onDownload: () => void;
  onReset: () => void;
  isVideo: boolean;
  videoProgress: VideoProcessingProgress | null;
  onCancelVideo: () => void;
  errorMessage: string | null;
  onClearError: () => void;
  isBatch?: boolean;
  batchCount?: number;
  allBatchCompleted?: boolean;
}

export function ActionFooter({
  mode,
  hasMask,
  isProcessing,
  isProcessed,
  onProcess,
  onDownload,
  onReset,
  isVideo,
  videoProgress,
  onCancelVideo,
  errorMessage,
  onClearError,
  isBatch = false,
  batchCount = 1,
  allBatchCompleted = false,
}: ActionFooterProps) {
  return (
    <footer className="w-full bg-[#111723] border-t border-[#222b3d] px-4 py-3 sticky bottom-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="flex items-center justify-between p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={onClearError}
              className="text-red-300 hover:text-white p-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Video Processing Progress Bar */}
        {isVideo && isProcessing && videoProgress && (
          <div className="w-full bg-[#0c1017] p-3 rounded-xl border border-[#222b3d] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                <span className="font-medium">{videoProgress.statusText}</span>
              </div>
              <div className="flex items-center gap-3">
                {videoProgress.fps > 0 && (
                  <span className="text-[11px] font-mono text-zinc-400">
                    {videoProgress.fps} FPS
                  </span>
                )}
                <span className="font-mono text-xs font-semibold text-indigo-400">
                  {videoProgress.percent}%
                </span>
                <button
                  type="button"
                  onClick={onCancelVideo}
                  className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </div>

            {/* Progress bar track */}
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-150 rounded-full"
                style={{ width: `${videoProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Bottom Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status info */}
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            {allBatchCompleted ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>All {batchCount} Videos Cleaned Successfully!</span>
              </span>
            ) : isProcessed ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Watermark Cleaned (Ready to Download)</span>
              </span>
            ) : hasMask ? (
              <span className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                <span>
                  {isBatch
                    ? `Ready for One-Tap Erase (${batchCount} Videos)`
                    : 'Watermark Selected (Ready to Erase)'}
                </span>
              </span>
            ) : (
              <span className="text-zinc-500">
                👆 Select watermark with the Box or Brush tool above, then click Erase
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#0c1017] hover:bg-[#161c28] border border-[#222b3d] text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-all"
              title="Upload new video(s)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            {isProcessed && (
              <button
                type="button"
                onClick={onDownload}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                {isBatch ? (
                  <>
                    <Package className="w-4 h-4" />
                    <span>Download All (.ZIP)</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Video</span>
                  </>
                )}
              </button>
            )}

            {!allBatchCompleted && (
              <button
                type="button"
                onClick={onProcess}
                disabled={!hasMask || isProcessing}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xl transition-all cursor-pointer ${
                  hasMask && !isProcessing
                    ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white shadow-indigo-500/30 ring-2 ring-indigo-400/50 scale-100 hover:scale-[1.02]'
                    : 'bg-zinc-800/80 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>
                      {isBatch ? 'Erasing Batch Videos...' : 'Erasing Watermark...'}
                    </span>
                  </>
                ) : isBatch ? (
                  <>
                    <Sparkles className="w-4 h-4 text-pink-200" />
                    <span>⚡ One-Tap Remove ({batchCount} Videos)</span>
                  </>
                ) : mode === 'ai' ? (
                  <>
                    <Sparkles className="w-4 h-4 text-pink-200" />
                    <span>Erase with AI Mode</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-200" />
                    <span>Erase Watermark ✨</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
