'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ToolType } from './Toolbar';
import { Eye, MoveHorizontal, Sparkles, CheckCircle2, RotateCcw, Target, X } from 'lucide-react';
import { inpaintImage } from '@/lib/inpainting';

interface CanvasWorkspaceProps {
  mediaType: 'image' | 'video' | null;
  imageSrc: string | null;
  videoSrc: string | null;
  tool: ToolType;
  brushSize: number;
  maskColor: string;
  zoom: number;
  onMaskChange: (hasMask: boolean) => void;
  outputDataUrl: string | null;
  outputVideoUrl: string | null;
  isComparing: boolean;
  onUndoReadyChange: (canUndo: boolean, canRedo: boolean) => void;
  onRegisterCanvasRefs: (baseCanvas: HTMLCanvasElement | null, maskCanvas: HTMLCanvasElement | null) => void;
  onRegisterVideoRef?: (video: HTMLVideoElement | null) => void;
  onVideoMetadataLoaded?: (duration: number, width: number, height: number) => void;
  onVideoTimeUpdate?: (currentTime: number) => void;
  onVideoEnded?: () => void;
  isLiveCleaned?: boolean;
  onToggleLiveCleaned?: () => void;
}

export function CanvasWorkspace({
  mediaType,
  imageSrc,
  videoSrc,
  tool,
  brushSize,
  maskColor,
  zoom,
  onMaskChange,
  outputDataUrl,
  outputVideoUrl,
  isComparing,
  onUndoReadyChange,
  onRegisterCanvasRefs,
  onRegisterVideoRef,
  onVideoMetadataLoaded,
  onVideoTimeUpdate,
  onVideoEnded,
  isLiveCleaned = false,
  onToggleLiveCleaned,
}: CanvasWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Drawing state
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const rectStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);

  // Undo / Redo history
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);

  // Split-slider state (for images)
  const [sliderPosition, setSliderPosition] = useState(50);
  const isDraggingSliderRef = useRef(false);

  // "Hold to peek original" state
  const [peekOriginal, setPeekOriginal] = useState(false);

  // Mask status
  const [hasMaskState, setHasMaskState] = useState(false);
  const hasMaskStateRef = useRef(false);

  // Custom cursor circle
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  // Expose canvas refs upwards
  useEffect(() => {
    onRegisterCanvasRefs(baseCanvasRef.current, maskCanvasRef.current);
  }, [onRegisterCanvasRefs, imageSrc, videoSrc, mediaType]);

  // Expose video ref upwards
  useEffect(() => {
    if (onRegisterVideoRef) {
      onRegisterVideoRef(videoRef.current);
    }
  }, [onRegisterVideoRef, videoSrc, mediaType]);

  // Push current mask state to undo stack
  const saveUndoState = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    undoStackRef.current.push(imgData);
    if (undoStackRef.current.length > 30) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    onUndoReadyChange(undoStackRef.current.length > 0, false);
  }, [onUndoReadyChange]);

  // Check if mask has any painted pixels
  const checkHasMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || maskCanvas.width === 0) return false;
    const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    const imgData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imgData.data;
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] > 10) {
        return true;
      }
    }
    return false;
  }, []);

  const updateMaskState = useCallback(() => {
    const hasNow = checkHasMask();
    hasMaskStateRef.current = hasNow;
    setHasMaskState(hasNow);
    onMaskChange(hasNow);
    return hasNow;
  }, [checkHasMask, onMaskChange]);

  // 1. Setup Image mode
  useEffect(() => {
    if (mediaType !== 'image' || !imageSrc) return;

    const img = new Image();
    img.crossOrigin = imageSrc.startsWith('http') ? 'anonymous' : null;
    img.src = imageSrc;
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      const baseCanvas = baseCanvasRef.current;
      if (baseCanvas) {
        baseCanvas.width = width;
        baseCanvas.height = height;
        const bCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
        if (bCtx) {
          bCtx.clearRect(0, 0, width, height);
          bCtx.drawImage(img, 0, 0);
        }
      }

      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        maskCanvas.width = width;
        maskCanvas.height = height;
        const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        if (mCtx) {
          mCtx.clearRect(0, 0, width, height);
        }
      }

      const tempCanvas = tempCanvasRef.current;
      if (tempCanvas) {
        tempCanvas.width = width;
        tempCanvas.height = height;
      }

      undoStackRef.current = [];
      redoStackRef.current = [];
      onUndoReadyChange(false, false);
      hasMaskStateRef.current = false;
      setHasMaskState(false);
      onMaskChange(false);
    };
  }, [mediaType, imageSrc, onMaskChange, onUndoReadyChange]);

  // 2. Setup Video mode
  const renderVideoFrame = useCallback(() => {
    const video = videoRef.current;
    const baseCanvas = baseCanvasRef.current;
    if (!video || !baseCanvas || video.videoWidth === 0) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (baseCanvas.width !== width || baseCanvas.height !== height) {
      baseCanvas.width = width;
      baseCanvas.height = height;
    }
    const bCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
    if (bCtx) {
      bCtx.drawImage(video, 0, 0, width, height);

      // If Live Cleaned preview is toggled ON, inpaint watermark live on this frame
      if (isLiveCleaned && hasMaskStateRef.current && maskCanvasRef.current) {
        inpaintImage(baseCanvas, maskCanvasRef.current, baseCanvas, {
          radius: 4,
          algorithm: 'telea',
          dilateMask: false,
        }).catch(() => {});
      }
    }
  }, [isLiveCleaned]);

  const handleVideoReady = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const width = video.videoWidth;
    const height = video.videoHeight;

    const baseCanvas = baseCanvasRef.current;
    if (baseCanvas && (baseCanvas.width !== width || baseCanvas.height !== height)) {
      baseCanvas.width = width;
      baseCanvas.height = height;
    }

    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas && (maskCanvas.width !== width || maskCanvas.height !== height)) {
      maskCanvas.width = width;
      maskCanvas.height = height;
    }

    const tempCanvas = tempCanvasRef.current;
    if (tempCanvas && (tempCanvas.width !== width || tempCanvas.height !== height)) {
      tempCanvas.width = width;
      tempCanvas.height = height;
    }

    // Force frame render immediately
    renderVideoFrame();

    // Nudge video slightly if at frame 0 to force browser decoder to produce first frame
    if (video.currentTime === 0) {
      try {
        video.currentTime = 0.001;
      } catch {}
    }

    // Re-render frame after tiny timeouts to catch any asynchronous hardware decode latency
    setTimeout(renderVideoFrame, 30);
    setTimeout(renderVideoFrame, 100);
    setTimeout(renderVideoFrame, 300);

    if (onVideoMetadataLoaded) {
      onVideoMetadataLoaded(video.duration || 0, width, height);
    }
  }, [onVideoMetadataLoaded, renderVideoFrame]);

  // Video source switch effect
  useEffect(() => {
    if (mediaType !== 'video' || !videoSrc) return;
    const timer1 = setTimeout(() => {
      handleVideoReady();
      renderVideoFrame();
    }, 50);
    const timer2 = setTimeout(() => {
      renderVideoFrame();
    }, 250);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [mediaType, videoSrc, handleVideoReady, renderVideoFrame]);

  // Video animation loop
  useEffect(() => {
    if (mediaType !== 'video' || !videoSrc) return;

    let animId: number;
    const loop = () => {
      const video = videoRef.current;
      if (video && !video.paused && !video.ended && video.videoWidth > 0) {
        renderVideoFrame();
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [mediaType, videoSrc, renderVideoFrame]);

  // Coordinate mapping from client viewport to canvas pixels
  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return { x: 0, y: 0 };
    const rect = maskCanvas.getBoundingClientRect();
    const scaleX = maskCanvas.width / (rect.width || 1);
    const scaleY = maskCanvas.height / (rect.height || 1);
    return {
      x: Math.max(0, Math.min(maskCanvas.width, (clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(maskCanvas.height, (clientY - rect.top) * scaleY)),
    };
  }, []);

  // START DRAWING (Pointer / Mouse / Touch)
  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas || maskCanvas.width === 0) return;

      saveUndoState();

      const coords = getCanvasCoords(clientX, clientY);
      isDrawingRef.current = true;
      lastPointRef.current = coords;
      hasMovedRef.current = false;

      if (tool === 'rectangle') {
        rectStartRef.current = coords;
        // Draw initial point on temp canvas
        const tempCanvas = tempCanvasRef.current;
        if (tempCanvas) {
          const tCtx = tempCanvas.getContext('2d');
          if (tCtx) {
            tCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
          }
        }
      } else {
        const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = maskColor;
          ctx.beginPath();
          ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    },
    [tool, brushSize, maskColor, getCanvasCoords, saveUndoState]
  );

  // MOVE DRAWING (Handles active drag for both brush and box marquee)
  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        setCursorPos({
          x: clientX - containerRect.left,
          y: clientY - containerRect.top,
          visible: true,
        });
      }

      if (!isDrawingRef.current) return;
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;

      const coords = getCanvasCoords(clientX, clientY);
      hasMovedRef.current = true;

      if (tool === 'rectangle') {
        const tempCanvas = tempCanvasRef.current;
        if (!tempCanvas || !rectStartRef.current) return;
        const tCtx = tempCanvas.getContext('2d');
        if (!tCtx) return;

        tCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        const x = Math.min(rectStartRef.current.x, coords.x);
        const y = Math.min(rectStartRef.current.y, coords.y);
        const w = Math.abs(coords.x - rectStartRef.current.x);
        const h = Math.abs(coords.y - rectStartRef.current.y);

        // Highlight box with semi-transparent fill
        tCtx.fillStyle = maskColor;
        tCtx.fillRect(x, y, w, h);

        // Crisp neon outline with marching-ants dash
        tCtx.strokeStyle = '#ffffff';
        tCtx.lineWidth = 2;
        tCtx.setLineDash([5, 5]);
        tCtx.strokeRect(x, y, w, h);

        // Corner handles for Magic Eraser look
        tCtx.fillStyle = '#6366f1';
        const handleSize = 6;
        tCtx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        tCtx.fillRect(x + w - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        tCtx.fillRect(x - handleSize / 2, y + h - handleSize / 2, handleSize, handleSize);
        tCtx.fillRect(x + w - handleSize / 2, y + h - handleSize / 2, handleSize, handleSize);

        lastPointRef.current = coords;
      } else {
        const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx || !lastPointRef.current) return;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize;

        if (tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = maskColor;
          ctx.beginPath();
          ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
        }
        ctx.restore();

        lastPointRef.current = coords;
      }
    },
    [tool, brushSize, maskColor, getCanvasCoords]
  );

  // END DRAWING (Commits box or brush stroke to maskCanvas)
  const handleEnd = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const maskCanvas = maskCanvasRef.current;
    const tempCanvas = tempCanvasRef.current;

    if (tool === 'rectangle' && rectStartRef.current) {
      if (maskCanvas && tempCanvas) {
        const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        const tCtx = tempCanvas.getContext('2d');

        if (mCtx) {
          // If clicked without dragging (single click), create a smart 160x55 watermark box centered on click
          if (!hasMovedRef.current || !lastPointRef.current) {
            const defaultW = Math.min(220, Math.round(maskCanvas.width * 0.25));
            const defaultH = Math.min(70, Math.round(maskCanvas.height * 0.12));
            const x = Math.max(0, Math.min(maskCanvas.width - defaultW, rectStartRef.current.x - defaultW / 2));
            const y = Math.max(0, Math.min(maskCanvas.height - defaultH, rectStartRef.current.y - defaultH / 2));

            mCtx.fillStyle = maskColor;
            mCtx.fillRect(x, y, defaultW, defaultH);
          } else {
            const x = Math.min(rectStartRef.current.x, lastPointRef.current.x);
            const y = Math.min(rectStartRef.current.y, lastPointRef.current.y);
            const w = Math.abs(lastPointRef.current.x - rectStartRef.current.x);
            const h = Math.abs(lastPointRef.current.y - rectStartRef.current.y);

            // Ignore accidental micro clicks < 3px, otherwise fill the box
            if (w > 3 && h > 3) {
              mCtx.fillStyle = maskColor;
              mCtx.fillRect(x, y, w, h);
            }
          }
        }

        if (tCtx) {
          tCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        }
      }
      rectStartRef.current = null;
    }

    lastPointRef.current = null;
    hasMovedRef.current = false;

    updateMaskState();

    if (isLiveCleaned) {
      renderVideoFrame();
    }
  }, [tool, maskColor, updateMaskState, isLiveCleaned, renderVideoFrame]);

  // Global window listeners for drag reliability (prevents dropping stroke if cursor leaves element)
  useEffect(() => {
    const onWindowMouseMove = (e: MouseEvent) => {
      if (isDrawingRef.current) {
        handleMove(e.clientX, e.clientY);
      }
    };
    const onWindowMouseUp = () => {
      if (isDrawingRef.current) {
        handleEnd();
      }
    };

    window.addEventListener('mousemove', onWindowMouseMove, { passive: true });
    window.addEventListener('mouseup', onWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [handleMove, handleEnd]);

  // Mouse event wrappers on Canvas
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };
  const onMouseUp = () => {
    handleEnd();
  };
  const onMouseLeave = () => {
    setCursorPos((prev) => ({ ...prev, visible: false }));
  };

  // Touch event wrappers on Canvas
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };
  const onTouchEnd = () => {
    handleEnd();
  };

  // Split-Slider Dragging
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSliderRef.current = true;

    const onWindowMove = (moveEvt: MouseEvent) => {
      if (!isDraggingSliderRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = moveEvt.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
      setSliderPosition(percentage);
    };

    const onWindowUp = () => {
      isDraggingSliderRef.current = false;
      window.removeEventListener('mousemove', onWindowMove);
      window.removeEventListener('mouseup', onWindowUp);
    };

    window.addEventListener('mousemove', onWindowMove);
    window.addEventListener('mouseup', onWindowUp);
  };

  // Undo Functionality
  const undo = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || undoStackRef.current.length === 0) return;

    const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const currentData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    redoStackRef.current.push(currentData);

    const previousData = undoStackRef.current.pop()!;
    ctx.putImageData(previousData, 0, 0);

    onUndoReadyChange(undoStackRef.current.length > 0, redoStackRef.current.length > 0);
    updateMaskState();
  }, [onUndoReadyChange, updateMaskState]);

  // Redo Functionality
  const redo = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || redoStackRef.current.length === 0) return;

    const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const currentData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    undoStackRef.current.push(currentData);

    const nextData = redoStackRef.current.pop()!;
    ctx.putImageData(nextData, 0, 0);

    onUndoReadyChange(undoStackRef.current.length > 0, redoStackRef.current.length > 0);
    updateMaskState();
  }, [onUndoReadyChange, updateMaskState]);

  // Clear Mask
  const clearMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    saveUndoState();
    const ctx = maskCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
    updateMaskState();
  }, [saveUndoState, updateMaskState]);

  // Apply Quick Watermark Presets
  const applyPreset = useCallback(
    (preset: 'bottom-right' | 'top-right' | 'bottom-subtitle' | 'top-left') => {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;
      saveUndoState();
      const ctx = maskCanvas.getContext('2d');
      if (!ctx) return;

      const w = maskCanvas.width;
      const h = maskCanvas.height;
      ctx.fillStyle = maskColor;

      if (preset === 'bottom-right') {
        const boxW = Math.round(w * 0.28);
        const boxH = Math.round(h * 0.12);
        ctx.fillRect(w - boxW - 20, h - boxH - 20, boxW, boxH);
      } else if (preset === 'top-right') {
        const boxW = Math.round(w * 0.28);
        const boxH = Math.round(h * 0.1);
        ctx.fillRect(w - boxW - 20, 20, boxW, boxH);
      } else if (preset === 'top-left') {
        const boxW = Math.round(w * 0.28);
        const boxH = Math.round(h * 0.1);
        ctx.fillRect(20, 20, boxW, boxH);
      } else if (preset === 'bottom-subtitle') {
        const boxW = Math.round(w * 0.75);
        const boxH = Math.round(h * 0.14);
        ctx.fillRect(Math.round((w - boxW) / 2), h - boxH - 20, boxW, boxH);
      }

      updateMaskState();
    },
    [maskColor, saveUndoState, updateMaskState]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const cursorDiameter = brushSize * zoom;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full min-h-[420px] bg-[#0c1017] overflow-hidden flex flex-col items-center justify-center select-none"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Background HTML5 Video element */}
      {mediaType === 'video' && videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          playsInline
          muted
          preload="auto"
          className="fixed -top-[9999px] -left-[9999px] opacity-0 pointer-events-none w-2 h-2"
          onLoadedMetadata={handleVideoReady}
          onLoadedData={handleVideoReady}
          onCanPlay={renderVideoFrame}
          onSeeked={renderVideoFrame}
          onPlay={renderVideoFrame}
          onTimeUpdate={() => {
            renderVideoFrame();
            if (videoRef.current && onVideoTimeUpdate) {
              onVideoTimeUpdate(videoRef.current.currentTime);
            }
          }}
          onEnded={() => onVideoEnded?.()}
        />
      )}

      {/* Magic Eraser Quick-Preset Floating Selector Bar */}
      {!outputVideoUrl && !outputDataUrl && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-[#161c28]/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-[#273248] shadow-2xl">
          <span className="text-[11px] font-bold text-zinc-300 mr-1 flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select:</span>
          </span>
          <button
            type="button"
            onClick={() => applyPreset('bottom-right')}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#1d2636] hover:bg-[#273248] text-zinc-200 hover:text-white transition-all border border-zinc-700/60"
            title="Auto-place box at bottom-right corner logo"
          >
            Bottom-Right Logo
          </button>
          <button
            type="button"
            onClick={() => applyPreset('top-right')}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#1d2636] hover:bg-[#273248] text-zinc-200 hover:text-white transition-all border border-zinc-700/60"
            title="Auto-place box at top-right timestamp"
          >
            Top-Right Stamp
          </button>
          <button
            type="button"
            onClick={() => applyPreset('bottom-subtitle')}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#1d2636] hover:bg-[#273248] text-zinc-200 hover:text-white transition-all border border-zinc-700/60"
            title="Auto-place wide box at bottom subtitle area"
          >
            Bottom Subtitle
          </button>
          {mediaType === 'video' && onToggleLiveCleaned && (
            <button
              type="button"
              onClick={onToggleLiveCleaned}
              className={`ml-2 px-3 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isLiveCleaned
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isLiveCleaned ? 'Live Clean Active ✨' : 'Live Erase Preview'}</span>
            </button>
          )}
        </div>
      )}

      {/* Dynamic Brush Follower Cursor */}
      {cursorPos.visible && !isComparing && !outputDataUrl && !outputVideoUrl && tool !== 'rectangle' && (
        <div
          className="pointer-events-none absolute rounded-full border border-white/80 bg-white/10 shadow-xs z-35 transition-transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            width: `${cursorDiameter}px`,
            height: `${cursorDiameter}px`,
          }}
        />
      )}

      {/* Main Canvas Stage */}
      <div
        className="relative max-w-full max-h-full transition-transform duration-100 ease-out shadow-2xl rounded-2xl overflow-hidden border border-[#273248] bg-checkerboard flex items-center justify-center cursor-crosshair"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          touchAction: 'none',
        }}
      >
        {/* Layer 0: Base Canvas (renders Photo or Video frame with 100% pixel-perfect coordinates) */}
        <canvas
          ref={baseCanvasRef}
          className="block max-w-[85vw] max-h-[62vh] object-contain pointer-events-none"
        />

        {/* Layer 1A: Restored Output Image Result */}
        {outputDataUrl && !peekOriginal && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={outputDataUrl}
            alt="Restored Result"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
            style={
              isComparing
                ? {
                    clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`,
                  }
                : undefined
            }
          />
        )}

        {/* Layer 1B: Restored Output Video Player */}
        {outputVideoUrl && !peekOriginal && (
          <video
            key={outputVideoUrl}
            src={outputVideoUrl}
            playsInline
            autoPlay
            muted
            loop
            controls
            className="absolute inset-0 w-full h-full object-contain z-15 shadow-2xl"
          />
        )}

        {/* Layer 2: Mask Drawing Canvas (Always captures mouse/touch events) */}
        <canvas
          ref={maskCanvasRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className={`absolute inset-0 w-full h-full z-20 cursor-crosshair ${
            outputDataUrl || outputVideoUrl ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        />

        {/* Layer 3: Temp Canvas for Rectangle Marquee preview while dragging */}
        <canvas
          ref={tempCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-25"
        />

        {/* Interactive Comparison Split Divider (for images) */}
        {outputDataUrl && isComparing && (
          <div
            className="absolute inset-y-0 z-30 cursor-ew-resize flex items-center justify-center -translate-x-1/2"
            style={{ left: `${sliderPosition}%` }}
            onMouseDown={handleSliderMouseDown}
          >
            <div className="w-0.5 h-full bg-white shadow-lg" />
            <div className="absolute w-8 h-8 rounded-full bg-white text-zinc-900 shadow-xl flex items-center justify-center ring-2 ring-indigo-500 hover:scale-110 transition-transform">
              <MoveHorizontal className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>

      {/* Floating Selection Confirmation Badge */}
      {hasMaskState && !outputVideoUrl && !outputDataUrl && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-[#161c28]/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-indigo-500/40 shadow-xl animate-in fade-in">
          <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Watermark Area Selected</span>
          </div>
          <button
            type="button"
            onClick={clearMask}
            className="ml-2 flex items-center gap-1 text-[11px] text-zinc-400 hover:text-red-400 px-2 py-1 bg-zinc-800/60 rounded-lg transition-colors"
            title="Clear current selection"
          >
            <X className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      )}

      {/* Floating Comparison Controls for Image outputs */}
      {outputDataUrl && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[#161c28]/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#273248] shadow-xl">
          <button
            type="button"
            onMouseDown={() => setPeekOriginal(true)}
            onMouseUp={() => setPeekOriginal(false)}
            onTouchStart={() => setPeekOriginal(true)}
            onTouchEnd={() => setPeekOriginal(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              peekOriginal
                ? 'bg-amber-500 text-zinc-900 shadow-md font-semibold'
                : 'bg-[#1d2636] text-zinc-200 hover:bg-[#273248]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Hold to View Original</span>
          </button>

          {isComparing && (
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-700 text-[11px] text-zinc-400">
              <span>Before (Left)</span>
              <span className="text-zinc-600">|</span>
              <span className="text-indigo-400 font-medium">After (Right)</span>
            </div>
          )}
        </div>
      )}

      {/* Floating Video Compare / Result Banner */}
      {outputVideoUrl && (
        <div className="absolute top-4 right-4 z-40 flex items-center gap-2 bg-[#161c28]/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-emerald-500/40 shadow-xl">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold mr-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Cleaned Video Ready</span>
          </div>
          <button
            type="button"
            onClick={() => setPeekOriginal(!peekOriginal)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1d2636] hover:bg-[#273248] text-zinc-200 hover:text-white rounded-xl text-xs font-medium transition-all border border-zinc-700/50"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>{peekOriginal ? 'Show Cleaned Video' : 'Compare Original Video'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
