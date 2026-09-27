'use client';

import React from 'react';
import {
  Paintbrush,
  Square,
  Eraser as EraserIcon,
  RotateCcw,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

export type ToolType = 'brush' | 'rectangle' | 'eraser';

interface ToolbarProps {
  tool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  brushSize: number;
  onChangeBrushSize: (size: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearMask: () => void;
  hasMask: boolean;
  mode: 'local' | 'ai';
  onToggleMode: (mode: 'local' | 'ai') => void;
  inpaintAlgorithm: 'telea' | 'ns';
  onChangeAlgorithm: (algo: 'telea' | 'ns') => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  isProcessed: boolean;
  isComparing: boolean;
  onToggleCompare: () => void;
}

export function Toolbar({
  tool,
  onSelectTool,
  brushSize,
  onChangeBrushSize,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearMask,
  hasMask,
  mode,
  onToggleMode,
  inpaintAlgorithm,
  onChangeAlgorithm,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isProcessed,
  isComparing,
  onToggleCompare,
}: ToolbarProps) {
  return (
    <div className="w-full bg-[#111723] border-b border-[#222b3d] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Left section: Selection & Masking Tools */}
      <div className="flex items-center gap-1.5 bg-[#0c1017] p-1 rounded-xl border border-[#222b3d]">
        <button
          type="button"
          onClick={() => onSelectTool('rectangle')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
            tool === 'rectangle'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161c28]'
          }`}
          title="Box Marquee (Click & drag to box watermark)"
        >
          <Square className="w-4 h-4" />
          <span>Box Marquee</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTool('brush')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
            tool === 'brush'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161c28]'
          }`}
          title="Freehand Brush Tool"
        >
          <Paintbrush className="w-4 h-4" />
          <span>Brush</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTool('eraser')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
            tool === 'eraser'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161c28]'
          }`}
          title="Eraser Tool"
        >
          <EraserIcon className="w-4 h-4" />
          <span>Eraser</span>
        </button>

        <div className="w-px h-5 bg-[#222b3d] mx-1" />

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-1.5 rounded-lg transition-colors ${
            canUndo ? 'text-zinc-300 hover:text-white hover:bg-[#161c28]' : 'text-zinc-600 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-1.5 rounded-lg transition-colors ${
            canRedo ? 'text-zinc-300 hover:text-white hover:bg-[#161c28]' : 'text-zinc-600 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onClearMask}
          disabled={!hasMask}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors ${
            hasMask ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10' : 'text-zinc-600 cursor-not-allowed'
          }`}
          title="Clear selection"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Clear</span>
        </button>
      </div>

      {/* Middle section: Brush Size Slider (active when brush is used) */}
      <div className="flex items-center gap-2.5 bg-[#0c1017] px-3 py-1.5 rounded-xl border border-[#222b3d]">
        <span className="text-zinc-400 text-xs flex items-center gap-1.5 font-medium whitespace-nowrap">
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
          Brush:
        </span>
        <input
          type="range"
          min={6}
          max={140}
          value={brushSize}
          onChange={(e) => onChangeBrushSize(Number(e.target.value))}
          className="w-20 sm:w-28 accent-indigo-500 cursor-pointer h-1.5 bg-[#222b3d] rounded-lg"
        />
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-zinc-200 text-xs w-8 text-right font-medium">
            {brushSize}px
          </span>
          <div
            className="rounded-full bg-indigo-400 border border-white/40 flex-shrink-0 transition-all"
            style={{
              width: `${Math.min(16, Math.max(4, brushSize / 4))}px`,
              height: `${Math.min(16, Math.max(4, brushSize / 4))}px`,
            }}
          />
        </div>
      </div>

      {/* Right section: Comparison & Zoom Controls */}
      <div className="flex items-center gap-2">
        {/* Inpaint Algorithm Pill */}
        {mode === 'local' ? (
          <div className="hidden lg:flex items-center gap-1 bg-[#0c1017] px-2 py-1 rounded-xl border border-[#222b3d]">
            <span className="text-[11px] text-zinc-400 mr-1">Inpaint:</span>
            <button
              type="button"
              onClick={() => onChangeAlgorithm('telea')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                inpaintAlgorithm === 'telea'
                  ? 'bg-zinc-800 text-indigo-300 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Telea
            </button>
            <button
              type="button"
              onClick={() => onChangeAlgorithm('ns')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                inpaintAlgorithm === 'ns'
                  ? 'bg-zinc-800 text-indigo-300 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Navier-Stokes
            </button>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-1 bg-purple-950/40 border border-purple-500/30 px-2.5 py-1 rounded-xl text-purple-300 text-[11px]">
            <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
            <span>AI Powered</span>
          </div>
        )}

        {/* Compare Button if Result is available */}
        {isProcessed && (
          <button
            type="button"
            onClick={onToggleCompare}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium border transition-all ${
              isComparing
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                : 'bg-[#0c1017] text-zinc-300 border-[#222b3d] hover:bg-[#161c28]'
            }`}
          >
            <span>{isComparing ? 'Exit Split' : 'Compare Split'}</span>
          </button>
        )}

        {/* Zoom Controls */}
        <div className="flex items-center bg-[#0c1017] p-1 rounded-xl border border-[#222b3d]">
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#161c28] rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onResetZoom}
            className="px-2 py-0.5 font-mono text-[11px] text-zinc-300 hover:text-white"
            title="Reset Zoom (100%)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#161c28] rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
