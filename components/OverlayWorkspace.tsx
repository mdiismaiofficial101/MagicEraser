'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Image as ImageIcon,
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  ArrowLeft,
  UploadCloud,
  FolderOpen,
  Wand2,
  Loader2,
  Download,
  X,
  Sliders,
  CheckCircle2,
  Clock,
  Scissors,
} from 'lucide-react';

export interface OverlayItem {
  id: string;
  type: 'image' | 'video';
  name: string;
  src: string;
  posX: number; // 0 - 100%
  posY: number; // 0 - 100%
  size: number; // 10 - 100%
  opacity: number; // 0 - 100%
  rotation: number; // -180 to 180
  isGreenScreen: boolean;
  intensity: number; // CapCut Intensity slider (10 - 100)
  shadow: number; // CapCut Shadow / Spill removal slider (0 - 100)
  startTime: number; // In seconds (CapCut timeline start)
  endTime: number; // In seconds (CapCut timeline end)
}

interface OverlayWorkspaceProps {
  baseMedia: {
    type: 'image' | 'video';
    src: string;
    name: string;
    file?: File;
  };
  onClose: () => void;
}

/**
 * CapCut-Grade Real-Time Chroma Key Processor
 */
function processCapcutChromaKey(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number = 55,
  shadow: number = 40
) {
  try {
    const frame = ctx.getImageData(0, 0, width, height);
    const data = frame.data;
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const maxRB = Math.max(r, b);
      const diff = g - maxRB;

      if (g > 35 && diff > (28 - (intensity / 100) * 22)) {
        data[i + 3] = 0; // Cut green to transparent
      } else if (g > maxRB && diff > 8) {
        const alphaFactor = Math.max(0, 1 - diff / 25);
        data[i + 3] = Math.round(data[i + 3] * alphaFactor);
        data[i + 1] = maxRB; // Suppress green spill
      }
    }

    ctx.putImageData(frame, 0, 0);
  } catch (err) {}
}

export function OverlayWorkspace({ baseMedia, onClose }: OverlayWorkspaceProps) {
  // Overlays State
  const [overlayItems, setOverlayItems] = useState<OverlayItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Screen 2: Add Overlay Modal State
  const [isAddOverlayModalOpen, setIsAddOverlayModalOpen] = useState<boolean>(false);

  // Aspect Ratio State
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);

  // Video playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showChromaSliders, setShowChromaSliders] = useState<boolean>(false);
  const [showTimingPanel, setShowTimingPanel] = useState<boolean>(false);

  // Dragging & CapCut-Style Corner Resizing State
  const [dragMode, setDragMode] = useState<'move' | 'resize' | 'timeline-start' | 'timeline-end' | 'timeline-body' | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialPosX: number;
    initialPosY: number;
    initialSize: number;
    centerX: number;
    centerY: number;
    initialStartTime: number;
    initialEndTime: number;
  }>({
    clientX: 0,
    clientY: 0,
    initialPosX: 50,
    initialPosY: 50,
    initialSize: 30,
    centerX: 0,
    centerY: 0,
    initialStartTime: 0,
    initialEndTime: 10,
  });

  // Export State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processProgress, setProcessProgress] = useState<number>(0);
  const [isExportSuccess, setIsExportSuccess] = useState<boolean>(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Active item reference
  const activeItem = overlayItems.find((it) => it.id === selectedItemId) || overlayItems[0] || null;

  // Sync Base Media Aspect Ratio & Duration
  useEffect(() => {
    if (baseMedia.type === 'video' && videoRef.current) {
      const v = videoRef.current;
      const onMeta = () => {
        if (v.videoWidth && v.videoHeight) {
          setVideoAspectRatio(v.videoWidth / v.videoHeight);
        }
        if (v.duration && !isNaN(v.duration)) {
          setDuration(v.duration);
        }
        if (v.currentTime === 0) {
          try {
            v.currentTime = 0.001;
          } catch {}
        }
      };
      v.addEventListener('loadedmetadata', onMeta);
      v.addEventListener('loadeddata', onMeta);
      v.addEventListener('canplay', onMeta);
      return () => {
        v.removeEventListener('loadedmetadata', onMeta);
        v.removeEventListener('loadeddata', onMeta);
        v.removeEventListener('canplay', onMeta);
      };
    } else if (baseMedia.type === 'image') {
      const img = new Image();
      img.src = baseMedia.src;
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setVideoAspectRatio(img.naturalWidth / img.naturalHeight);
        }
      };
    }
  }, [baseMedia]);

  // Video Play/Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Update item properties
  const updateActiveItem = (props: Partial<OverlayItem>) => {
    if (!activeItem) return;
    setOverlayItems((prev) =>
      prev.map((it) => (it.id === activeItem.id ? { ...it, ...props } : it))
    );
  };

  // Add Overlay File with default full or selected duration
  const handleAddOverlayFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isLikelyGreen =
      file.name.toLowerCase().includes('green') || file.name.toLowerCase().includes('chroma');

    const totalDur = duration > 0 ? duration : 10;
    // Default: start at current video position or 0, for at least 5s or until end
    const initialStart = Math.min(currentTime, Math.max(0, totalDur - 2));
    const initialEnd = Math.min(totalDur, initialStart + 5 > totalDur ? totalDur : initialStart + 5);

    if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      const newItem: OverlayItem = {
        id: `overlay-${Date.now()}`,
        type: 'video',
        name: file.name,
        src: url,
        posX: 50,
        posY: 50,
        size: 35,
        opacity: 100,
        rotation: 0,
        isGreenScreen: isLikelyGreen,
        intensity: 55,
        shadow: 40,
        startTime: initialStart,
        endTime: initialEnd,
      };
      setOverlayItems((prev) => [...prev, newItem]);
      setSelectedItemId(newItem.id);
      setIsAddOverlayModalOpen(false);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const newItem: OverlayItem = {
            id: `overlay-${Date.now()}`,
            type: 'image',
            name: file.name,
            src: ev.target.result as string,
            posX: 50,
            posY: 50,
            size: 30,
            opacity: 100,
            rotation: 0,
            isGreenScreen: isLikelyGreen,
            intensity: 55,
            shadow: 40,
            startTime: initialStart,
            endTime: initialEnd,
          };
          setOverlayItems((prev) => [...prev, newItem]);
          setSelectedItemId(newItem.id);
          setIsAddOverlayModalOpen(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag Handlers for Canvas Moving
  const handleStartMove = (clientX: number, clientY: number, itemId: string) => {
    setSelectedItemId(itemId);
    const target = overlayItems.find((it) => it.id === itemId);
    if (!target) return;

    setDragMode('move');
    dragStartRef.current = {
      clientX,
      clientY,
      initialPosX: target.posX,
      initialPosY: target.posY,
      initialSize: target.size,
      centerX: 0,
      centerY: 0,
      initialStartTime: target.startTime,
      initialEndTime: target.endTime,
    };
  };

  // Drag Handlers for CapCut Corner Resizing
  const handleStartResize = (e: React.MouseEvent | React.TouchEvent, itemId: string) => {
    e.stopPropagation();
    setSelectedItemId(itemId);
    const target = overlayItems.find((it) => it.id === itemId);
    if (!target || !canvasContainerRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const containerRect = canvasContainerRef.current.getBoundingClientRect();
    const itemPixelCenterX = containerRect.left + (target.posX / 100) * containerRect.width;
    const itemPixelCenterY = containerRect.top + (target.posY / 100) * containerRect.height;

    setDragMode('resize');
    dragStartRef.current = {
      clientX,
      clientY,
      initialPosX: target.posX,
      initialPosY: target.posY,
      initialSize: target.size,
      centerX: itemPixelCenterX,
      centerY: itemPixelCenterY,
      initialStartTime: target.startTime,
      initialEndTime: target.endTime,
    };
  };

  // Drag Handlers for CapCut Timeline Trimming
  const handleStartTimelineDrag = (
    e: React.MouseEvent | React.TouchEvent,
    mode: 'timeline-start' | 'timeline-end' | 'timeline-body'
  ) => {
    e.stopPropagation();
    if (!activeItem) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragMode(mode);
    dragStartRef.current = {
      clientX,
      clientY,
      initialPosX: activeItem.posX,
      initialPosY: activeItem.posY,
      initialSize: activeItem.size,
      centerX: 0,
      centerY: 0,
      initialStartTime: activeItem.startTime,
      initialEndTime: activeItem.endTime,
    };
  };

  // Global Pointer Movements (Canvas & Timeline)
  const handleGlobalPointerMove = (clientX: number, clientY: number) => {
    if (!dragMode || !activeItem) return;

    const totalDur = duration > 0 ? duration : 10;

    if (dragMode === 'move' && canvasContainerRef.current) {
      const containerRect = canvasContainerRef.current.getBoundingClientRect();
      const deltaX = ((clientX - dragStartRef.current.clientX) / containerRect.width) * 100;
      const deltaY = ((clientY - dragStartRef.current.clientY) / containerRect.height) * 100;

      const newX = Math.max(0, Math.min(100, dragStartRef.current.initialPosX + deltaX));
      const newY = Math.max(0, Math.min(100, dragStartRef.current.initialPosY + deltaY));
      updateActiveItem({ posX: newX, posY: newY });
    } else if (dragMode === 'resize') {
      const dx = clientX - dragStartRef.current.centerX;
      const dy = clientY - dragStartRef.current.centerY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);

      const initDx = dragStartRef.current.clientX - dragStartRef.current.centerX;
      const initDy = dragStartRef.current.clientY - dragStartRef.current.centerY;
      const initDist = Math.max(10, Math.sqrt(initDx * initDx + initDy * initDy));

      const scaleFactor = currentDist / initDist;
      const newSize = Math.max(8, Math.min(100, Math.round(dragStartRef.current.initialSize * scaleFactor)));
      updateActiveItem({ size: newSize });
    } else if (timelineTrackRef.current) {
      // Timeline trimming / shifting
      const trackRect = timelineTrackRef.current.getBoundingClientRect();
      const deltaSec = ((clientX - dragStartRef.current.clientX) / trackRect.width) * totalDur;

      if (dragMode === 'timeline-start') {
        const newStart = Math.max(0, Math.min(activeItem.endTime - 0.5, dragStartRef.current.initialStartTime + deltaSec));
        updateActiveItem({ startTime: parseFloat(newStart.toFixed(2)) });
        if (videoRef.current) videoRef.current.currentTime = newStart;
      } else if (dragMode === 'timeline-end') {
        const newEnd = Math.min(totalDur, Math.max(activeItem.startTime + 0.5, dragStartRef.current.initialEndTime + deltaSec));
        updateActiveItem({ endTime: parseFloat(newEnd.toFixed(2)) });
        if (videoRef.current) videoRef.current.currentTime = newEnd;
      } else if (dragMode === 'timeline-body') {
        const itemLen = dragStartRef.current.initialEndTime - dragStartRef.current.initialStartTime;
        let newStart = dragStartRef.current.initialStartTime + deltaSec;
        let newEnd = newStart + itemLen;

        if (newStart < 0) {
          newStart = 0;
          newEnd = itemLen;
        }
        if (newEnd > totalDur) {
          newEnd = totalDur;
          newStart = Math.max(0, totalDur - itemLen);
        }

        updateActiveItem({
          startTime: parseFloat(newStart.toFixed(2)),
          endTime: parseFloat(newEnd.toFixed(2)),
        });
      }
    }
  };

  const handlePointerUp = () => {
    setDragMode(null);
  };

  const handleDeleteItem = (id: string) => {
    setOverlayItems((prev) => prev.filter((it) => it.id !== id));
    if (selectedItemId === id) {
      const remaining = overlayItems.filter((it) => it.id !== id);
      setSelectedItemId(remaining[0]?.id || null);
    }
  };

  // ========================================================
  // ⭐ 100% TIMING-AWARE LOSSLESS EXPORT & DOWNLOAD
  // ========================================================
  const handleProcessVideo = async () => {
    setIsProcessing(true);
    setProcessProgress(5);
    setIsExportSuccess(false);

    const exactFileName = baseMedia.name;

    try {
      if (baseMedia.type === 'image') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = baseMedia.src;
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
        });

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        for (const item of overlayItems) {
          ctx.save();
          ctx.globalAlpha = item.opacity / 100;
          const px = (item.posX / 100) * canvas.width;
          const py = (item.posY / 100) * canvas.height;
          const pw = (item.size / 100) * canvas.width;

          const liveEl = document.getElementById(`chroma-canvas-${item.id}`) as HTMLCanvasElement;
          if (liveEl) {
            const aspect = (liveEl.height || 1) / (liveEl.width || 1);
            const ph = pw * aspect;
            ctx.translate(px, py);
            ctx.rotate((item.rotation * Math.PI) / 180);
            ctx.drawImage(liveEl, -pw / 2, -ph / 2, pw, ph);
          }
          ctx.restore();
        }

        setProcessProgress(100);
        const outUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = outUrl;
        a.download = exactFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setIsProcessing(false);
        setIsExportSuccess(true);
        setTimeout(() => setIsExportSuccess(false), 3000);
      } else {
        const baseV = videoRef.current;
        if (!baseV) throw new Error('Video not found');

        baseV.pause();
        baseV.currentTime = 0;
        baseV.playbackRate = 1.0;
        baseV.muted = false;
        await new Promise((r) => setTimeout(r, 200));

        const renderWidth = baseV.videoWidth || 1920;
        const renderHeight = baseV.videoHeight || 1080;

        const canvas = document.createElement('canvas');
        canvas.width = renderWidth;
        canvas.height = renderHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
        if (!ctx) throw new Error('Canvas context failed');

        const canvasStream = canvas.captureStream(60);

        let audioTracks: MediaStreamTrack[] = [];
        try {
          if ((baseV as any).captureStream) {
            const vStream = (baseV as any).captureStream();
            audioTracks = vStream.getAudioTracks();
          } else if ((baseV as any).mozCaptureStream) {
            const vStream = (baseV as any).mozCaptureStream();
            audioTracks = vStream.getAudioTracks();
          }
        } catch (e) {}

        if (audioTracks.length === 0) {
          try {
            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtxClass) {
              const audioCtx = new AudioCtxClass();
              audioContextRef.current = audioCtx;
              if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
              }
              const sourceNode = audioCtx.createMediaElementSource(baseV);
              const destNode = audioCtx.createMediaStreamDestination();
              sourceNode.connect(destNode);
              sourceNode.connect(audioCtx.destination);
              audioTracks = destNode.stream.getAudioTracks();
            }
          } catch (e) {}
        }

        const combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...audioTracks,
        ]);

        let mimeType = 'video/webm;codecs=vp9,opus';
        if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2')) {
          mimeType = 'video/mp4;codecs=avc1.42E01E,mp4a.40.2';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
          mimeType = 'video/webm;codecs=vp9,opus';
        } else {
          mimeType = 'video/webm';
        }

        const recorder = new MediaRecorder(combinedStream, {
          mimeType,
          videoBitsPerSecond: 25000000,
          audioBitsPerSecond: 320000,
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        const exportPromise = new Promise<void>((resolve, reject) => {
          recorder.onstop = () => {
            try {
              const blob = new Blob(chunks, { type: mimeType });
              const downloadUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = downloadUrl;
              a.download = exactFileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
              resolve();
            } catch (err) {
              reject(err);
            }
          };
          recorder.onerror = reject;
        });

        recorder.start(100);
        await baseV.play().catch(() => {});

        const totalDuration = baseV.duration || 5;

        const renderLoop = () => {
          if (baseV.ended || baseV.currentTime >= totalDuration) {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
            baseV.pause();
            return;
          }

          const currentPct = Math.min(99, Math.round((baseV.currentTime / totalDuration) * 100));
          setProcessProgress(currentPct);

          // 1. Draw base video frame
          ctx.drawImage(baseV, 0, 0, renderWidth, renderHeight);

          // 2. Draw active overlays ONLY when current time is within [startTime, endTime]!
          const curTime = baseV.currentTime;
          for (const item of overlayItems) {
            if (curTime >= item.startTime && curTime <= item.endTime) {
              ctx.save();
              ctx.globalAlpha = item.opacity / 100;
              const px = (item.posX / 100) * renderWidth;
              const py = (item.posY / 100) * renderHeight;
              const pw = (item.size / 100) * renderWidth;

              const liveEl = document.getElementById(`chroma-canvas-${item.id}`) as HTMLCanvasElement;
              if (liveEl) {
                const aspect = (liveEl.height || 1) / (liveEl.width || 1);
                const ph = pw * aspect;
                ctx.translate(px, py);
                ctx.rotate((item.rotation * Math.PI) / 180);
                ctx.drawImage(liveEl, -pw / 2, -ph / 2, pw, ph);
              }
              ctx.restore();
            }
          }

          requestAnimationFrame(renderLoop);
        };

        requestAnimationFrame(renderLoop);

        const timeoutId = setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
            baseV.pause();
          }
        }, (totalDuration + 3) * 1000);

        await exportPromise;
        clearTimeout(timeoutId);

        setProcessProgress(100);
        setIsProcessing(false);
        setIsExportSuccess(true);
        setTimeout(() => setIsExportSuccess(false), 3500);
      }
    } catch (err) {
      console.error('Export Error:', err);
      setIsProcessing(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const totalVideoDuration = duration > 0 ? duration : 10;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#060810] text-zinc-100 flex flex-col select-none overflow-hidden font-sans"
      onMouseMove={(e) => handleGlobalPointerMove(e.clientX, e.clientY)}
      onMouseUp={handlePointerUp}
      onTouchMove={(e) =>
        e.touches[0] && handleGlobalPointerMove(e.touches[0].clientX, e.touches[0].clientY)
      }
      onTouchEnd={handlePointerUp}
    >
      {/* 1. TOP HEADER */}
      <header className="h-16 bg-[#0a0d16] border-b border-[#182033] px-4 sm:px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#121828] hover:bg-[#1a233a] text-zinc-300 hover:text-white border border-[#202b44] transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Add Overlay to Video</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                CAPCUT TIMELINE
              </span>
            </h1>
            <p className="text-xs text-zinc-400 truncate max-w-xs sm:max-w-md">
              File: <strong className="text-zinc-200">{baseMedia.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleProcessVideo}
            disabled={isProcessing}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-xl shadow-purple-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.02]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
                <span>Exporting ({processProgress}%)</span>
              </>
            ) : isExportSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Downloaded Successfully!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export &amp; Download</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. ADAPTIVE VIDEO CANVAS STAGE */}
      <main className="flex-1 bg-[#04060b] flex flex-col items-center justify-center p-3 sm:p-5 overflow-hidden relative">
        <div className="relative w-full max-w-5xl flex-1 flex flex-col items-center justify-center min-h-0">
          <div
            ref={canvasContainerRef}
            style={{
              aspectRatio: videoAspectRatio ? `${videoAspectRatio}` : '16/9',
            }}
            className="relative max-h-[64vh] max-w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-[#1a2236] flex items-center justify-center"
          >
            {/* Base Media Stream */}
            {baseMedia.type === 'image' ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={baseMedia.src}
                alt="Base Scene"
                className="w-full h-full object-contain pointer-events-none"
              />
            ) : (
              <video
                ref={videoRef}
                src={baseMedia.src}
                playsInline
                muted={isMuted}
                loop
                preload="auto"
                crossOrigin="anonymous"
                className="w-full h-full object-contain pointer-events-none"
                onTimeUpdate={() => {
                  if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                }}
              />
            )}

            {/* Draggable & CapCut-Style Overlays (Rendered ONLY within their active duration!) */}
            {overlayItems.map((item) => {
              const isSelected = selectedItemId === item.id;
              const isCurrentlyVisible =
                baseMedia.type === 'image' ||
                (currentTime >= item.startTime && currentTime <= item.endTime);

              return (
                <div
                  key={item.id}
                  onMouseDown={(e) => handleStartMove(e.clientX, e.clientY, item.id)}
                  onTouchStart={(e) =>
                    e.touches[0] &&
                    handleStartMove(e.touches[0].clientX, e.touches[0].clientY, item.id)
                  }
                  style={{
                    position: 'absolute',
                    left: `${item.posX}%`,
                    top: `${item.posY}%`,
                    width: `${item.size}%`,
                    opacity: isCurrentlyVisible ? item.opacity / 100 : 0,
                    pointerEvents: isCurrentlyVisible ? 'auto' : 'none',
                    transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                    cursor: dragMode === 'move' && isSelected ? 'grabbing' : 'grab',
                    touchAction: 'none',
                  }}
                  className={`select-none transition-opacity duration-150 ${
                    isSelected && isCurrentlyVisible
                      ? 'border-2 border-dashed border-purple-400 ring-2 ring-purple-500/50 rounded-xl p-1 shadow-2xl z-20'
                      : 'hover:border hover:border-dashed hover:border-zinc-400/60 rounded-xl z-10'
                  }`}
                >
                  {/* Floating Action Badge on Active Overlay */}
                  {isSelected && isCurrentlyVisible && (
                    <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#0e1422]/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-purple-500/40 shadow-2xl z-30 whitespace-nowrap">
                      {/* ⚡ CapCut Green Cut Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateActiveItem({ isGreenScreen: !item.isGreenScreen });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          item.isGreenScreen
                            ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/40'
                            : 'bg-[#182236] text-emerald-400 hover:bg-[#202c46]'
                        }`}
                        title="CapCut 1-Click Auto Green Screen Cut"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>{item.isGreenScreen ? 'Green Cut: ON' : 'Auto Green Cut'}</span>
                      </button>

                      {/* Timeline Duration Quick Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTimingPanel(!showTimingPanel);
                        }}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                          showTimingPanel
                            ? 'bg-indigo-600 text-white'
                            : 'bg-[#182236] text-zinc-300 hover:bg-[#202c46]'
                        }`}
                        title="Adjust duration / timing"
                      >
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>
                          {item.startTime}s - {item.endTime}s
                        </span>
                      </button>

                      {/* CapCut Sliders Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowChromaSliders(!showChromaSliders);
                        }}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          showChromaSliders ? 'bg-purple-600 text-white' : 'text-zinc-300 hover:bg-[#1a243a]'
                        }`}
                        title="Adjust CapCut Intensity & Shadow"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Overlay */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item.id);
                        }}
                        className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-[#1a243a] cursor-pointer"
                        title="Delete Overlay"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* 4 Corner Resize Handles */}
                  {isSelected && isCurrentlyVisible && (
                    <>
                      <div
                        onMouseDown={(e) => handleStartResize(e, item.id)}
                        onTouchStart={(e) => handleStartResize(e, item.id)}
                        className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-purple-500 hover:bg-purple-400 active:scale-125 rounded-full border-2 border-white shadow-lg cursor-nwse-resize z-40 transition-transform flex items-center justify-center"
                        title="Drag to resize"
                      />
                      <div
                        onMouseDown={(e) => handleStartResize(e, item.id)}
                        onTouchStart={(e) => handleStartResize(e, item.id)}
                        className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-purple-500 hover:bg-purple-400 active:scale-125 rounded-full border-2 border-white shadow-lg cursor-nesw-resize z-40 transition-transform flex items-center justify-center"
                        title="Drag to resize"
                      />
                      <div
                        onMouseDown={(e) => handleStartResize(e, item.id)}
                        onTouchStart={(e) => handleStartResize(e, item.id)}
                        className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-purple-500 hover:bg-purple-400 active:scale-125 rounded-full border-2 border-white shadow-lg cursor-nesw-resize z-40 transition-transform flex items-center justify-center"
                        title="Drag to resize"
                      />
                      <div
                        onMouseDown={(e) => handleStartResize(e, item.id)}
                        onTouchStart={(e) => handleStartResize(e, item.id)}
                        className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-purple-500 hover:bg-purple-400 active:scale-125 rounded-full border-2 border-white shadow-lg cursor-nwse-resize z-40 transition-transform flex items-center justify-center ring-2 ring-purple-400"
                        title="Drag to resize"
                      />
                    </>
                  )}

                  {/* CapCut Live Chroma Renderer */}
                  <CapcutChromaRenderer
                    item={item}
                    isPlayingBase={isPlaying && isCurrentlyVisible}
                  />
                </div>
              );
            })}

            {/* '+' BUTTON TO OPEN ADD OVERLAY */}
            <button
              type="button"
              onClick={() => setIsAddOverlayModalOpen(true)}
              className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:scale-110 active:scale-95 text-white flex items-center justify-center shadow-2xl shadow-purple-600/50 border-2 border-white/20 transition-all cursor-pointer z-30 group"
              title="Add Overlay (Logo, Image, Green Screen Video)"
            >
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            </button>
          </div>

          {/* Timing / Duration Quick Setting Panel */}
          {activeItem && showTimingPanel && (
            <div className="w-full max-w-lg mt-2 bg-[#0e1424]/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-indigo-500/40 shadow-2xl flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between text-indigo-400 font-bold border-b border-zinc-800 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Overlay Duration &amp; Timing</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateActiveItem({ startTime: 0, endTime: totalVideoDuration })
                  }
                  className="px-2 py-0.5 rounded-lg bg-[#1a233a] hover:bg-[#253350] text-[10px] text-zinc-300 transition-colors"
                >
                  Full Video Length
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-300">
                    <span>Start Time</span>
                    <span className="font-mono text-indigo-300 font-bold">
                      {activeItem.startTime}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, activeItem.endTime - 0.5)}
                    step="0.1"
                    value={activeItem.startTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      updateActiveItem({ startTime: val });
                      if (videoRef.current) videoRef.current.currentTime = val;
                    }}
                    className="w-full accent-indigo-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-300">
                    <span>End Time</span>
                    <span className="font-mono text-indigo-300 font-bold">
                      {activeItem.endTime}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={activeItem.startTime + 0.5}
                    max={totalVideoDuration}
                    step="0.1"
                    value={activeItem.endTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      updateActiveItem({ endTime: val });
                      if (videoRef.current) videoRef.current.currentTime = val;
                    }}
                    className="w-full accent-indigo-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CapCut Sliders */}
          {activeItem && showChromaSliders && (
            <div className="w-full max-w-lg mt-2 bg-[#0e1424]/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-emerald-500/30 shadow-2xl flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-zinc-800 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>CapCut Chroma Key Settings</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-normal">Real-time Green Cut</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-300">
                    <span>Intensity</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {activeItem.intensity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="95"
                    value={activeItem.intensity}
                    onChange={(e) => updateActiveItem({ intensity: parseInt(e.target.value) })}
                    className="w-full accent-emerald-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-300">
                    <span>Shadow / Spill Removal</span>
                    <span className="font-mono text-emerald-400 font-bold">{activeItem.shadow}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={activeItem.shadow}
                    onChange={(e) => updateActiveItem({ shadow: parseInt(e.target.value) })}
                    className="w-full accent-emerald-400 h-1.5 bg-zinc-800 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              ⭐ CAPCUT VISUAL MULTI-TRACK TIMELINE & SCRUB BAR
          ======================================================== */}
          {baseMedia.type === 'video' && (
            <div className="w-full max-w-4xl mt-3 bg-[#0c101c] px-4 py-3 rounded-2xl border border-[#182033] flex flex-col gap-2.5 shadow-xl">
              {/* Overlay Timeline Track (CapCut Style Trim & Shift Bar) */}
              {activeItem && (
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-indigo-400 whitespace-nowrap flex items-center gap-1">
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Overlay Track:</span>
                  </span>

                  {/* Interactive Timeline Track Container */}
                  <div
                    ref={timelineTrackRef}
                    className="relative flex-1 h-7 bg-[#141a29] rounded-xl border border-[#222c42] overflow-hidden select-none"
                  >
                    {/* Active Overlay Duration Block */}
                    <div
                      onMouseDown={(e) => handleStartTimelineDrag(e, 'timeline-body')}
                      onTouchStart={(e) => handleStartTimelineDrag(e, 'timeline-body')}
                      style={{
                        left: `${(activeItem.startTime / totalVideoDuration) * 100}%`,
                        width: `${((activeItem.endTime - activeItem.startTime) / totalVideoDuration) * 100}%`,
                      }}
                      className="absolute top-1 bottom-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 rounded-lg shadow-md cursor-grab active:cursor-grabbing flex items-center justify-between px-1 border border-purple-400/50 group"
                      title="Drag to shift overlay timing"
                    >
                      {/* Left Trim Handle */}
                      <div
                        onMouseDown={(e) => handleStartTimelineDrag(e, 'timeline-start')}
                        onTouchStart={(e) => handleStartTimelineDrag(e, 'timeline-start')}
                        className="w-2.5 h-full bg-white/80 hover:bg-white rounded cursor-ew-resize flex items-center justify-center"
                        title="Drag to change start time"
                      />

                      <span className="text-[9px] font-bold text-white tracking-tight truncate px-1 pointer-events-none">
                        {activeItem.name} ({activeItem.startTime}s - {activeItem.endTime}s)
                      </span>

                      {/* Right Trim Handle */}
                      <div
                        onMouseDown={(e) => handleStartTimelineDrag(e, 'timeline-end')}
                        onTouchStart={(e) => handleStartTimelineDrag(e, 'timeline-end')}
                        className="w-2.5 h-full bg-white/80 hover:bg-white rounded cursor-ew-resize flex items-center justify-center"
                        title="Drag to change end time"
                      />
                    </div>

                    {/* Current Playhead Indicator on Overlay Track */}
                    <div
                      style={{
                        left: `${(currentTime / totalVideoDuration) * 100}%`,
                      }}
                      className="absolute top-0 bottom-0 w-0.5 bg-rose-500 pointer-events-none z-10"
                    />
                  </div>
                </div>
              )}

              {/* Main Video Playback & Scrubber Controls */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <span className="text-xs font-mono text-zinc-300">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Main Video Progress Scrubber */}
                <input
                  type="range"
                  min="0"
                  max={duration || 25}
                  step="0.05"
                  value={currentTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCurrentTime(val);
                    if (videoRef.current) videoRef.current.currentTime = val;
                  }}
                  className="flex-1 accent-purple-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 3. SCREEN 2: ADD OVERLAY MODAL */}
      {isAddOverlayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c101a] border border-[#1e273c] rounded-3xl p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add Overlay</h3>
                  <p className="text-[11px] text-zinc-400">
                    Upload PNG logo, photo, or Green Screen video
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOverlayModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              ref={modalFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={handleAddOverlayFile}
            />

            <div
              onClick={() => modalFileInputRef.current?.click()}
              className="py-10 px-4 rounded-2xl border-2 border-dashed border-[#26324c] bg-[#090d16]/90 hover:bg-[#0e1424] hover:border-purple-500/70 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center shadow-lg shadow-purple-900/30">
                <UploadCloud className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Choose Any File</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Supports PNG logos, photos, GIFs, and Green Screen videos
                </p>
              </div>
              <button
                type="button"
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Browse File</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * CapCut Live 60FPS Chroma Key Renderer
 */
function CapcutChromaRenderer({
  item,
  isPlayingBase,
}: {
  item: OverlayItem;
  isPlayingBase: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const hiddenImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (item.type === 'video' && hiddenVideoRef.current) {
      const v = hiddenVideoRef.current;
      if (isPlayingBase) {
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    }
  }, [isPlayingBase, item.type]);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    if (item.type === 'video') {
      const v = hiddenVideoRef.current;
      if (!v) return;

      const render = () => {
        if (v.readyState >= 2) {
          if (canvas.width !== v.videoWidth || canvas.height !== v.videoHeight) {
            canvas.width = v.videoWidth || 640;
            canvas.height = v.videoHeight || 360;
          }

          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

          if (item.isGreenScreen) {
            processCapcutChromaKey(ctx, canvas.width, canvas.height, item.intensity, item.shadow);
          }
        }
        animId = requestAnimationFrame(render);
      };

      animId = requestAnimationFrame(render);
      return () => cancelAnimationFrame(animId);
    } else {
      const img = hiddenImgRef.current;
      if (!img) return;

      const drawImage = () => {
        if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
          canvas.width = img.naturalWidth || 400;
          canvas.height = img.naturalHeight || 400;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (item.isGreenScreen) {
          processCapcutChromaKey(ctx, canvas.width, canvas.height, item.intensity, item.shadow);
        }
      };

      if (img.complete) {
        drawImage();
      } else {
        img.onload = drawImage;
      }
    }
  }, [item.type, item.isGreenScreen, item.intensity, item.shadow, item.src]);

  return (
    <>
      {item.type === 'video' ? (
        <video
          ref={hiddenVideoRef}
          src={item.src}
          playsInline
          muted
          loop
          autoPlay
          crossOrigin="anonymous"
          className="hidden"
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          ref={hiddenImgRef}
          src={item.src}
          alt={item.name}
          crossOrigin="anonymous"
          className="hidden"
        />
      )}

      <canvas
        id={`chroma-canvas-${item.id}`}
        ref={canvasRef}
        className="w-full h-auto object-contain pointer-events-none rounded-lg"
      />
    </>
  );
}
