'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Eye, EyeOff, Cpu, Sliders, CheckCircle2, ShieldAlert } from 'lucide-react';
import { isOpenCvAvailable } from '@/lib/opencv-loader';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  inpaintRadius: number;
  onSaveInpaintRadius: (radius: number) => void;
  inpaintAlgorithm: 'telea' | 'ns';
  onSaveAlgorithm: (algo: 'telea' | 'ns') => void;
  maskColor: string;
  onSaveMaskColor: (color: string) => void;
}

export function SettingsModal(props: SettingsModalProps) {
  if (!props.isOpen) return null;
  return <SettingsModalDialog {...props} />;
}

function SettingsModalDialog({
  onClose,
  apiKey,
  onSaveApiKey,
  inpaintRadius,
  onSaveInpaintRadius,
  inpaintAlgorithm,
  onSaveAlgorithm,
  maskColor,
  onSaveMaskColor,
}: SettingsModalProps) {
  const [tempKey, setTempKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [tempRadius, setTempRadius] = useState(inpaintRadius);
  const [tempAlgo, setTempAlgo] = useState<'telea' | 'ns'>(inpaintAlgorithm);
  const [tempColor, setTempColor] = useState(maskColor);
  const [openCvStatus, setOpenCvStatus] = useState<boolean>(() => isOpenCvAvailable());
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setOpenCvStatus(isOpenCvAvailable());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = () => {
    onSaveApiKey(tempKey.trim());
    onSaveInpaintRadius(tempRadius);
    onSaveAlgorithm(tempAlgo);
    onSaveMaskColor(tempColor);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 600);
  };

  const handleClearKey = () => {
    setTempKey('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a] bg-[#121212]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Application Settings</h2>
              <p className="text-xs text-zinc-400">Configure AI keys & local inpainting algorithms</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-[#27272a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Gemini API Key Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                Gemini API Key
              </label>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Stored in LocalStorage
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Required for <strong>AI Mode</strong> restoration on static deployments. When left blank in AI Studio, server secrets are used automatically.
            </p>
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="AIzaSy... (optional for AI Mode)"
                className="w-full pl-3 pr-20 py-2.5 bg-[#121212] border border-[#27272a] focus:border-indigo-500 focus:outline-hidden text-sm text-zinc-100 placeholder-zinc-500 rounded-xl"
              />
              <div className="absolute right-2 flex items-center gap-1">
                {tempKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="p-1 text-xs text-zinc-400 hover:text-zinc-200"
                    title="Clear key"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                  title={showKey ? 'Hide Key' : 'Show Key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Local Mode Engine Info */}
          <div className="p-3.5 bg-[#121212] border border-[#27272a] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">
                  {openCvStatus ? 'OpenCV.js Engine' : 'Built-in Inpainting Engine'}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {openCvStatus
                    ? 'Client-side WebAssembly active & ready'
                    : 'High-speed Fast Marching & Navier-Stokes active'}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {openCvStatus ? 'WASM Active' : 'Ready (Offline)'}
            </span>
          </div>

          {/* Local Inpaint Algorithm */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-200">Local Inpainting Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTempAlgo('telea')}
                className={`p-3 text-left border rounded-xl transition-all ${
                  tempAlgo === 'telea'
                    ? 'border-indigo-500 bg-indigo-500/10 text-zinc-100'
                    : 'border-[#27272a] bg-[#121212] text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">Telea Algorithm</span>
                  {tempAlgo === 'telea' && <span className="w-2 h-2 rounded-full bg-indigo-400" />}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Fast Marching Method. Smooth blending, ideal for photos and gradients.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTempAlgo('ns')}
                className={`p-3 text-left border rounded-xl transition-all ${
                  tempAlgo === 'ns'
                    ? 'border-indigo-500 bg-indigo-500/10 text-zinc-100'
                    : 'border-[#27272a] bg-[#121212] text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">Navier-Stokes</span>
                  {tempAlgo === 'ns' && <span className="w-2 h-2 rounded-full bg-indigo-400" />}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Fluid dynamics inpainting. Preserves sharp lines and continuous contours.
                </p>
              </button>
            </div>
          </div>

          {/* Inpaint Radius Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-200">Inpaint Boundary Radius</label>
              <span className="text-xs font-mono text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">
                {tempRadius} px
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={15}
              step={1}
              value={tempRadius}
              onChange={(e) => setTempRadius(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer h-2 bg-[#27272a] rounded-lg"
            />
            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>2px (Sharp/Tight)</span>
              <span>8px (Balanced)</span>
              <span>15px (Broad Blur)</span>
            </div>
          </div>

          {/* Mask Highlight Color */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-200">Mask Overlay Color</label>
            <div className="flex items-center gap-3">
              {[
                { name: 'Red/Coral', val: 'rgba(239, 68, 68, 0.55)' },
                { name: 'Hot Pink', val: 'rgba(236, 72, 153, 0.55)' },
                { name: 'Purple', val: 'rgba(168, 85, 247, 0.55)' },
                { name: 'Cyan', val: 'rgba(6, 182, 212, 0.55)' },
                { name: 'Emerald', val: 'rgba(16, 185, 129, 0.55)' },
              ].map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setTempColor(c.val)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    tempColor === c.val ? 'scale-110 border-white' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.val.replace(/0\.55\)$/, '1)') }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#27272a] bg-[#121212]/50">
          <span className="text-xs text-zinc-500 flex items-center gap-1.5">
            {savedToast ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Preferences saved!
              </span>
            ) : (
              '100% Client-Side Privacy'
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-[#27272a] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
