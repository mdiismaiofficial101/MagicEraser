'use client';

import React from 'react';
import { Sparkles, Settings, Zap, Video, PlusCircle, Layers } from 'lucide-react';
import { ActiveTabType } from './UploadDropzone';

interface HeaderProps {
  onOpenSettings: () => void;
  mode: 'local' | 'ai';
  onToggleMode: (mode: 'local' | 'ai') => void;
  activeTab?: ActiveTabType;
  onSelectTab?: (tab: ActiveTabType) => void;
}

export function Header({
  onOpenSettings,
  mode,
  onToggleMode,
  activeTab = 'clean',
  onSelectTab,
}: HeaderProps) {
  return (
    <header className="w-full bg-[#090d16]/95 backdrop-blur-md border-b border-[#1b2234] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* MagicEraser Brand Logo */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-base sm:text-lg font-black tracking-tight text-white">
              Magic<span className="text-purple-400">Eraser</span>
            </span>
          </div>

          {/* Navigation Tabs (Remove / Overlay / Batch) */}
          <nav className="hidden md:flex items-center gap-2 h-16 pt-1">
            <button
              type="button"
              onClick={() => onSelectTab?.('clean')}
              className={`h-full flex items-center gap-2 px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                activeTab === 'clean'
                  ? 'text-white border-purple-500'
                  : 'text-zinc-400 border-transparent hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Remove Watermark</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab?.('overlay')}
              className={`h-full flex items-center gap-2 px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                activeTab === 'overlay'
                  ? 'text-white border-purple-500'
                  : 'text-zinc-400 border-transparent hover:text-zinc-200'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Overlay / Watermark</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab?.('batch')}
              className={`h-full flex items-center gap-2 px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                activeTab === 'batch'
                  ? 'text-white border-purple-500'
                  : 'text-zinc-400 border-transparent hover:text-zinc-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Batch (1-10)</span>
            </button>
          </nav>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#10141e] p-1 rounded-xl border border-[#1e2538]">
            <button
              type="button"
              onClick={() => onToggleMode('local')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'local'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Fast in-browser OpenCV inpainting"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden sm:inline">Local Free</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </button>
            <button
              type="button"
              onClick={() => onToggleMode('ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'ai'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Advanced AI Inpainting"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-300" />
              <span>AI Mode</span>
            </button>
          </div>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 text-zinc-400 hover:text-white hover:bg-[#151b2a] rounded-xl border border-[#1e2538] transition-all cursor-pointer"
            title="Settings & Preferences"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
