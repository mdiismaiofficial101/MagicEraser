'use client';

import React from 'react';
import {
  Film,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  AlertCircle,
  Copy,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Layers,
  ArrowRight,
  Package,
} from 'lucide-react';

export interface BatchItem {
  id: string;
  serialNumber: number; // 1, 2, 3... strictly preserved
  file: File;
  originalName: string;
  videoUrl: string;
  duration: number;
  width: number;
  height: number;
  maskCanvas: HTMLCanvasElement | null;
  hasMask: boolean;
  status: 'pending_selection' | 'ready' | 'processing' | 'completed' | 'error';
  progress: number;
  statusText?: string;
  outputBlob: Blob | null;
  outputUrl: string | null;
  error?: string;
}

interface BatchVideoQueueProps {
  items: BatchItem[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  onApplyCurrentMaskToAll: () => void;
  onStartOneTapBatch: () => void;
  isProcessingBatch: boolean;
  onDownloadSingle: (item: BatchItem) => void;
  onDownloadAllZip: () => void;
  isZipping?: boolean;
}

export function BatchVideoQueue({
  items,
  activeIndex,
  onSelectIndex,
  onApplyCurrentMaskToAll,
  onStartOneTapBatch,
  isProcessingBatch,
  onDownloadSingle,
  onDownloadAllZip,
  isZipping = false,
}: BatchVideoQueueProps) {
  const allReadyOrCompleted = items.every(
    (item) => item.hasMask || item.status === 'completed'
  );
  const completedCount = items.filter((item) => item.status === 'completed').length;
  const allCompleted = items.length > 0 && completedCount === items.length;

  return (
    <div className="w-full bg-[#111723] border-b border-[#222b3d] px-3 sm:px-6 py-3">
      {/* Top Status & One-Tap Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Batch Queue: {items.length} Videos</span>
          </div>

          <span className="text-xs text-zinc-400">
            {completedCount > 0 ? (
              <span className="text-emerald-400 font-medium">
                {completedCount} of {items.length} Cleaned
              </span>
            ) : (
              <span>Video #{activeIndex + 1} Selected</span>
            )}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Apply Mask to All Videos button */}
          {!isProcessingBatch && !allCompleted && (
            <button
              type="button"
              onClick={onApplyCurrentMaskToAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#1d2636] hover:bg-[#273248] text-zinc-200 border border-zinc-700/60 transition-all cursor-pointer"
              title="Copy current video's watermark box to all other videos in the queue"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
              <span>Apply Box to All ({items.length})</span>
            </button>
          )}

          {/* Download All in ZIP button when completed */}
          {allCompleted && (
            <button
              type="button"
              onClick={onDownloadAllZip}
              disabled={isZipping}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              {isZipping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating ZIP...</span>
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  <span>Download All Cleaned Videos (.ZIP)</span>
                </>
              )}
            </button>
          )}

          {/* ONE-TAP REMOVE BUTTON */}
          {!allCompleted && (
            <button
              type="button"
              onClick={onStartOneTapBatch}
              disabled={isProcessingBatch || !items.some((it) => it.hasMask)}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xl cursor-pointer ${
                isProcessingBatch
                  ? 'bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-not-allowed'
                  : items.some((it) => it.hasMask)
                  ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white shadow-indigo-500/30 ring-2 ring-indigo-400/40 hover:scale-[1.02]'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
              }`}
            >
              {isProcessingBatch ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Processing Batch...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-pink-200" />
                  <span>⚡ One-Tap Remove All</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Serial Videos Horizontal Carousel / List (Mobile & Desktop Responsive) */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-700">
        {items.map((item, idx) => {
          const isActive = idx === activeIndex;

          return (
            <div
              key={item.id}
              onClick={() => !isProcessingBatch && onSelectIndex(idx)}
              className={`flex-shrink-0 w-52 sm:w-60 p-2.5 rounded-xl border transition-all text-left relative cursor-pointer ${
                isActive
                  ? 'bg-[#182234] border-indigo-500 shadow-md shadow-indigo-500/20 ring-1 ring-indigo-400/50'
                  : 'bg-[#0f141f] border-[#222b3d] hover:border-zinc-600 hover:bg-[#131b2a]'
              } ${isProcessingBatch ? 'pointer-events-none' : ''}`}
            >
              {/* Serial Number Badge */}
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  #{item.serialNumber}
                </span>

                {/* Status Indicator */}
                {item.status === 'completed' ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Cleaned
                  </span>
                ) : item.status === 'processing' ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                    {item.progress}%
                  </span>
                ) : item.hasMask ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                    <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                    Watermark Set
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-medium bg-zinc-800/60 px-1.5 py-0.5 rounded">
                    Needs Box
                  </span>
                )}
              </div>

              {/* Video Title & Duration */}
              <p
                className="text-xs font-semibold text-zinc-200 truncate mb-1"
                title={item.originalName}
              >
                {item.originalName}
              </p>

              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  {item.duration > 0 ? `${Math.round(item.duration)}s` : 'Loading...'}
                </span>

                {item.status === 'completed' && item.outputBlob && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadSingle(item);
                    }}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 px-2 py-0.5 rounded border border-emerald-500/30 transition-all cursor-pointer"
                  >
                    <Download className="w-2.5 h-2.5" />
                    <span>Download</span>
                  </button>
                )}
              </div>

              {/* Real-time processing progress bar */}
              {item.status === 'processing' && (
                <div className="w-full bg-zinc-800 rounded-full h-1 mt-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1 transition-all duration-150"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows for switching videos easily on mobile/desktop */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1d2636] text-xs">
        <button
          type="button"
          onClick={() => onSelectIndex(Math.max(0, activeIndex - 1))}
          disabled={activeIndex === 0 || isProcessingBatch}
          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
            activeIndex > 0 && !isProcessingBatch
              ? 'text-zinc-300 hover:text-white hover:bg-zinc-800/80 cursor-pointer'
              : 'text-zinc-600 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Video</span>
        </button>

        <span className="text-[11px] text-zinc-400">
          Editing Watermark on Video{' '}
          <strong className="text-zinc-200">#{activeIndex + 1}</strong> of{' '}
          <strong className="text-zinc-200">{items.length}</strong>
        </span>

        <button
          type="button"
          onClick={() => onSelectIndex(Math.min(items.length - 1, activeIndex + 1))}
          disabled={activeIndex === items.length - 1 || isProcessingBatch}
          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
            activeIndex < items.length - 1 && !isProcessingBatch
              ? 'text-zinc-300 hover:text-white hover:bg-zinc-800/80 cursor-pointer'
              : 'text-zinc-600 cursor-not-allowed'
          }`}
        >
          <span>Next Video</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
