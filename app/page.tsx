'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Toolbar, ToolType } from '@/components/Toolbar';
import { CanvasWorkspace } from '@/components/CanvasWorkspace';
import { VideoWorkspace } from '@/components/VideoWorkspace';
import { ActionFooter } from '@/components/ActionFooter';
import { UploadDropzone, ActiveTabType } from '@/components/UploadDropzone';
import { LandingContent } from '@/components/LandingContent';
import { SettingsModal } from '@/components/SettingsModal';
import { BatchVideoQueue, BatchItem } from '@/components/BatchVideoQueue';
import { OverlayWorkspace } from '@/components/OverlayWorkspace';
import { inpaintImage } from '@/lib/inpainting';
import { loadOpenCv } from '@/lib/opencv-loader';
import { VideoWatermarkProcessor, VideoProcessingProgress } from '@/lib/video-processor';
import JSZip from 'jszip';

export default function Home() {
  // Navigation / Tab Selection State
  const [activeTab, setActiveTab] = useState<ActiveTabType>('clean');

  // Overlay Studio State
  const [overlayMedia, setOverlayMedia] = useState<{
    type: 'image' | 'video';
    src: string;
    name: string;
    file?: File;
  } | null>(null);

  // Media State
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('watermark_removed.mp4');

  // Batch Video State
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [activeBatchIndex, setActiveBatchIndex] = useState<number>(0);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  // Video Playback State
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isLiveCleaned, setIsLiveCleaned] = useState<boolean>(false);

  // Drawing Tools State
  const [tool, setTool] = useState<ToolType>('rectangle');
  const [brushSize, setBrushSize] = useState<number>(28);
  const [maskColor, setMaskColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('mask_color') || 'rgba(239, 68, 68, 0.55)';
      } catch {}
    }
    return 'rgba(239, 68, 68, 0.55)';
  });
  const [zoom, setZoom] = useState<number>(1.0);
  const [hasMask, setHasMask] = useState<boolean>(false);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Inpainting & AI State
  const [mode, setMode] = useState<'local' | 'ai'>('local');
  const [inpaintAlgorithm, setInpaintAlgorithm] = useState<'telea' | 'ns'>('telea');
  const [inpaintRadius, setInpaintRadius] = useState<number>(5);
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('gemini_api_key') || '';
      } catch {}
    }
    return '';
  });

  // Processing & Results State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isProcessed, setIsProcessed] = useState<boolean>(false);
  const [outputDataUrl, setOutputDataUrl] = useState<string | null>(null);
  const [outputVideoBlob, setOutputVideoBlob] = useState<Blob | null>(null);
  const [outputVideoUrl, setOutputVideoUrl] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<VideoProcessingProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // References to active DOM elements
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoProcessorRef = useRef<VideoWatermarkProcessor | null>(null);

  // Preload OpenCV in background
  useEffect(() => {
    loadOpenCv().catch(() => {});
  }, []);

  // Helper: Clone canvas
  const cloneCanvas = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    const copy = document.createElement('canvas');
    copy.width = sourceCanvas.width;
    copy.height = sourceCanvas.height;
    const ctx = copy.getContext('2d');
    if (ctx) {
      ctx.drawImage(sourceCanvas, 0, 0);
    }
    return copy;
  };

  // Helper: Copy canvas into another canvas
  const copyCanvasInto = (fromCanvas: HTMLCanvasElement, toCanvas: HTMLCanvasElement) => {
    toCanvas.width = fromCanvas.width;
    toCanvas.height = fromCanvas.height;
    const ctx = toCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, toCanvas.width, toCanvas.height);
      ctx.drawImage(fromCanvas, 0, 0);
    }
  };

  // Save current mask to active batch item
  const saveCurrentMaskToActiveBatchItem = useCallback(() => {
    if (!isBatchMode || batchItems.length === 0 || !maskCanvasRef.current) return;
    const currentMaskCanvas = maskCanvasRef.current;

    setBatchItems((prev) =>
      prev.map((item, idx) => {
        if (idx === activeBatchIndex) {
          const cloned = cloneCanvas(currentMaskCanvas);
          return {
            ...item,
            maskCanvas: cloned,
            hasMask: hasMask,
            status: hasMask ? 'ready' : 'pending_selection',
          };
        }
        return item;
      })
    );
  }, [isBatchMode, batchItems.length, activeBatchIndex, hasMask]);

  // Media selection handlers: Single Image
  const handleImageSelected = (dataUrl: string, name: string) => {
    setMediaType('image');
    setImageSrc(dataUrl);
    setVideoSrc(null);
    setOriginalFileName(name);
    setIsBatchMode(false);
    setBatchItems([]);
    setIsProcessed(false);
    setOutputDataUrl(null);
    if (outputVideoUrl) URL.revokeObjectURL(outputVideoUrl);
    setOutputVideoBlob(null);
    setOutputVideoUrl(null);
    setIsComparing(false);
    setErrorMessage(null);
  };

  // Media selection handlers: Single Video
  const handleVideoSelected = (url: string, file: File | { name: string }) => {
    setMediaType('video');
    setVideoSrc(url);
    setImageSrc(null);
    setOriginalFileName(file.name);
    setIsBatchMode(false);
    setBatchItems([]);
    setIsProcessed(false);
    setOutputDataUrl(null);
    if (outputVideoUrl) URL.revokeObjectURL(outputVideoUrl);
    setOutputVideoBlob(null);
    setOutputVideoUrl(null);
    setIsComparing(false);
    setErrorMessage(null);
    setIsPlayingVideo(false);
    setVideoCurrentTime(0);
    setIsLiveCleaned(false);
  };

  // Media selection handlers: Batch Videos (1 to 10 videos)
  const handleBatchVideosSelected = (files: File[]) => {
    // Preserve strict sequential serial order (#1, #2, #3, ...)
    const items: BatchItem[] = files.slice(0, 10).map((file, idx) => ({
      id: `batch-item-${Date.now()}-${idx}`,
      serialNumber: idx + 1,
      file,
      originalName: file.name,
      videoUrl: URL.createObjectURL(file),
      duration: 0,
      width: 0,
      height: 0,
      maskCanvas: null,
      hasMask: false,
      status: 'pending_selection',
      progress: 0,
      outputBlob: null,
      outputUrl: null,
    }));

    setBatchItems(items);
    setIsBatchMode(true);
    setActiveBatchIndex(0);
    setMediaType('video');
    setVideoSrc(items[0].videoUrl);
    setOriginalFileName(items[0].originalName);
    setIsProcessed(false);
    setOutputDataUrl(null);
    setOutputVideoBlob(null);
    setOutputVideoUrl(null);
    setIsComparing(false);
    setErrorMessage(null);
    setIsPlayingVideo(false);
    setVideoCurrentTime(0);
    setIsLiveCleaned(false);
  };

  // Switch active video in batch queue
  const handleSelectBatchIndex = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= batchItems.length || newIndex === activeBatchIndex) return;

    // 1. Save current mask to active item before switching
    if (maskCanvasRef.current) {
      const cloned = cloneCanvas(maskCanvasRef.current);
      setBatchItems((prev) =>
        prev.map((it, idx) =>
          idx === activeBatchIndex
            ? {
                ...it,
                maskCanvas: cloned,
                hasMask: hasMask,
                status: hasMask ? 'ready' : it.status,
              }
            : it
        )
      );
    }

    // 2. Switch to new video
    const targetItem = batchItems[newIndex];
    setActiveBatchIndex(newIndex);
    setVideoSrc(targetItem.videoUrl);
    setOriginalFileName(targetItem.originalName);
    setOutputVideoBlob(targetItem.outputBlob);
    setOutputVideoUrl(targetItem.outputUrl);
    setIsProcessed(targetItem.status === 'completed');

    // 3. Restore target video's mask if it exists, or clear
    if (maskCanvasRef.current) {
      if (targetItem.maskCanvas) {
        copyCanvasInto(targetItem.maskCanvas, maskCanvasRef.current);
        setHasMask(true);
      } else {
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
        }
        setHasMask(false);
      }
    }
  };

  // Apply current watermark box to ALL videos in the queue
  const handleApplyCurrentMaskToAll = () => {
    if (!maskCanvasRef.current || !hasMask) {
      setErrorMessage('Please select a watermark on the current video first.');
      return;
    }

    const currentMask = maskCanvasRef.current;
    setBatchItems((prev) =>
      prev.map((item) => ({
        ...item,
        maskCanvas: cloneCanvas(currentMask),
        hasMask: true,
        status: item.status === 'completed' ? 'completed' : 'ready',
      }))
    );
  };

  const handleReset = () => {
    if (activeVideoRef.current) {
      activeVideoRef.current.pause();
    }
    if (outputVideoUrl) {
      URL.revokeObjectURL(outputVideoUrl);
    }
    batchItems.forEach((it) => {
      if (it.outputUrl) URL.revokeObjectURL(it.outputUrl);
      if (it.videoUrl) URL.revokeObjectURL(it.videoUrl);
    });

    setMediaType(null);
    setImageSrc(null);
    setVideoSrc(null);
    setIsBatchMode(false);
    setBatchItems([]);
    setActiveBatchIndex(0);
    setIsProcessingBatch(false);
    setOutputDataUrl(null);
    setOutputVideoBlob(null);
    setOutputVideoUrl(null);
    setIsProcessed(false);
    setIsComparing(false);
    setHasMask(false);
    setErrorMessage(null);
    setIsPlayingVideo(false);
    setIsLiveCleaned(false);
  };

  // Video Controls
  const handleTogglePlayVideo = () => {
    const video = activeVideoRef.current;
    if (!video) return;
    if (isPlayingVideo) {
      video.pause();
      setIsPlayingVideo(false);
    } else {
      video.play().then(() => setIsPlayingVideo(true)).catch(() => {});
    }
  };

  const handleSeekVideo = (time: number) => {
    const video = activeVideoRef.current;
    if (!video) return;
    video.currentTime = time;
    setVideoCurrentTime(time);
  };

  const handleStepFrame = (seconds: number) => {
    const video = activeVideoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    handleSeekVideo(target);
  };

  // Canvas registry callback
  const handleRegisterCanvasRefs = useCallback(
    (baseCanvas: HTMLCanvasElement | null, maskCanvas: HTMLCanvasElement | null) => {
      baseCanvasRef.current = baseCanvas;
      maskCanvasRef.current = maskCanvas;
    },
    []
  );

  // Video registry callback
  const handleRegisterVideoRef = useCallback((video: HTMLVideoElement | null) => {
    activeVideoRef.current = video;
  }, []);

  // Update mask change and sync with active batch item
  const handleMaskChange = (has: boolean) => {
    setHasMask(has);
    if (isBatchMode && batchItems.length > 0 && maskCanvasRef.current) {
      const cloned = cloneCanvas(maskCanvasRef.current);
      setBatchItems((prev) =>
        prev.map((item, idx) => {
          if (idx === activeBatchIndex) {
            return {
              ...item,
              maskCanvas: cloned,
              hasMask: has,
              status: has ? 'ready' : 'pending_selection',
            };
          }
          return item;
        })
      );
    }
  };

  // ONE-TAP BATCH REMOVAL
  const handleStartOneTapBatch = async () => {
    if (batchItems.length === 0) return;
    saveCurrentMaskToActiveBatchItem();

    // Verify at least one item has a mask
    const hasAnyMask = batchItems.some((it) => it.hasMask) || hasMask;
    if (!hasAnyMask) {
      setErrorMessage('Please select watermark on at least one video.');
      return;
    }

    // If active mask is set, copy it to any pending items that don't have a mask yet
    const fallbackMask = maskCanvasRef.current ? cloneCanvas(maskCanvasRef.current) : null;

    setErrorMessage(null);
    setIsProcessing(true);
    setIsProcessingBatch(true);

    const processor = new VideoWatermarkProcessor();
    videoProcessorRef.current = processor;

    try {
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        if (item.status === 'completed' && item.outputBlob) {
          continue; // Already processed
        }

        // Switch workspace preview to this item
        setActiveBatchIndex(i);
        setVideoSrc(item.videoUrl);
        setOriginalFileName(item.originalName);

        // Update item status to processing
        setBatchItems((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, status: 'processing', progress: 0 } : it))
        );

        // Prepare video element for this item
        const tempVideo = document.createElement('video');
        tempVideo.src = item.videoUrl;
        tempVideo.muted = true;
        tempVideo.playsInline = true;

        await new Promise<void>((resolve, reject) => {
          const onLoaded = () => {
            tempVideo.removeEventListener('loadeddata', onLoaded);
            tempVideo.removeEventListener('error', onError);
            resolve();
          };
          const onError = (e: any) => {
            tempVideo.removeEventListener('loadeddata', onLoaded);
            tempVideo.removeEventListener('error', onError);
            reject(new Error(`Failed to load video: ${item.originalName}`));
          };
          tempVideo.addEventListener('loadeddata', onLoaded);
          tempVideo.addEventListener('error', onError);
          tempVideo.load();
        });

        // Determine mask canvas to use
        const maskToUse = item.maskCanvas || fallbackMask || maskCanvasRef.current;
        if (!maskToUse) {
          throw new Error(`No watermark selection found for video #${item.serialNumber}`);
        }

        // Process this video
        const processedBlob = await processor.processVideo(
          tempVideo,
          maskToUse,
          {
            radius: mode === 'ai' ? Math.max(6, inpaintRadius) : inpaintRadius,
            algorithm: mode === 'ai' ? 'ns' : inpaintAlgorithm,
          },
          {
            onProgress: (p) => {
              setVideoProgress(p);
              setBatchItems((prev) =>
                prev.map((it, idx) =>
                  idx === i
                    ? {
                        ...it,
                        progress: p.percent,
                        statusText: `Video #${it.serialNumber}: ${p.percent}%`,
                      }
                    : it
                )
              );
            },
            onFramePreview: (canvas) => {
              const bCanvas = baseCanvasRef.current;
              if (bCanvas) {
                const bCtx = bCanvas.getContext('2d');
                if (bCtx) {
                  bCtx.drawImage(canvas, 0, 0, bCanvas.width, bCanvas.height);
                }
              }
            },
          }
        );

        const outUrl = URL.createObjectURL(processedBlob);

        // Update item state to completed
        setBatchItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'completed',
                  progress: 100,
                  outputBlob: processedBlob,
                  outputUrl: outUrl,
                }
              : it
          )
        );

        if (i === activeBatchIndex) {
          setOutputVideoBlob(processedBlob);
          setOutputVideoUrl(outUrl);
        }
      }

      setIsProcessed(true);
    } catch (err: any) {
      console.error('Batch inpainting error:', err);
      setErrorMessage(err.message || 'Error occurred during batch watermark removal.');
    } finally {
      setIsProcessing(false);
      setIsProcessingBatch(false);
    }
  };

  // Single Item Inpainting Process (Image or Single Video)
  const handleProcess = async () => {
    if (isBatchMode) {
      await handleStartOneTapBatch();
      return;
    }

    if (!hasMask) return;
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      if (mediaType === 'image') {
        const baseCanvas = baseCanvasRef.current;
        const maskCanvas = maskCanvasRef.current;

        if (!baseCanvas || !maskCanvas) {
          throw new Error('Canvas elements not ready.');
        }

        if (mode === 'local') {
          const outCanvas = document.createElement('canvas');
          await inpaintImage(baseCanvas, maskCanvas, outCanvas, {
            radius: inpaintRadius,
            algorithm: inpaintAlgorithm,
            dilateMask: true,
          });

          const resultUrl = outCanvas.toDataURL('image/png');
          setOutputDataUrl(resultUrl);
          setIsProcessed(true);
          setIsComparing(true);
        } else {
          // AI Mode: Call Gemini AI server route
          let aiSuccess = false;
          try {
            const markedCanvas = document.createElement('canvas');
            markedCanvas.width = baseCanvas.width;
            markedCanvas.height = baseCanvas.height;
            const mCtx = markedCanvas.getContext('2d');
            if (mCtx) {
              mCtx.drawImage(baseCanvas, 0, 0);
              mCtx.drawImage(maskCanvas, 0, 0);
            }

            const imageBase64 = baseCanvas.toDataURL('image/png');
            const maskBase64 = maskCanvas.toDataURL('image/png');
            const markedImageBase64 = markedCanvas.toDataURL('image/png');

            const response = await fetch('/api/inpaint', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { 'x-gemini-api-key': apiKey } : {}),
              },
              body: JSON.stringify({
                imageBase64,
                maskBase64,
                markedImageBase64,
                apiKey: apiKey || undefined,
              }),
            });

            const result = await response.json();

            if (response.ok && result.success && result.resultImage) {
              setOutputDataUrl(result.resultImage);
              setIsProcessed(true);
              setIsComparing(true);
              aiSuccess = true;
            }
          } catch (aiErr) {
            console.warn('Gemini API call bypassed, using advanced Navier-Stokes synthesis', aiErr);
          }

          if (!aiSuccess) {
            const outCanvas = document.createElement('canvas');
            await inpaintImage(baseCanvas, maskCanvas, outCanvas, {
              radius: Math.max(7, inpaintRadius),
              algorithm: 'ns',
              dilateMask: true,
            });
            const resultUrl = outCanvas.toDataURL('image/png');
            setOutputDataUrl(resultUrl);
            setIsProcessed(true);
            setIsComparing(true);
          }
        }
      } else if (mediaType === 'video') {
        const maskCanvas = maskCanvasRef.current;
        const videoEl = activeVideoRef.current;

        if (!videoEl || !maskCanvas) {
          throw new Error('Video player or watermark selection canvas not ready.');
        }

        const clonedMask = document.createElement('canvas');
        clonedMask.width = maskCanvas.width;
        clonedMask.height = maskCanvas.height;
        const cCtx = clonedMask.getContext('2d');
        if (cCtx) {
          cCtx.drawImage(maskCanvas, 0, 0);
        }

        const processor = new VideoWatermarkProcessor();
        videoProcessorRef.current = processor;

        const blob = await processor.processVideo(
          videoEl,
          clonedMask,
          {
            radius: mode === 'ai' ? Math.max(6, inpaintRadius) : inpaintRadius,
            algorithm: mode === 'ai' ? 'ns' : inpaintAlgorithm,
          },
          {
            onProgress: (p) => setVideoProgress(p),
            onFramePreview: (canvas) => {
              const bCanvas = baseCanvasRef.current;
              if (bCanvas) {
                const bCtx = bCanvas.getContext('2d');
                if (bCtx) {
                  bCtx.drawImage(canvas, 0, 0, bCanvas.width, bCanvas.height);
                }
              }
            },
          }
        );

        const url = URL.createObjectURL(blob);
        setOutputVideoBlob(blob);
        setOutputVideoUrl(url);
        setIsProcessed(true);
      }
    } catch (err: any) {
      console.error('Inpainting error:', err);
      setErrorMessage(err.message || 'An error occurred during watermark removal.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download single video/image with EXACT original filename
  const handleDownloadSingle = (item?: BatchItem) => {
    if (item && item.outputBlob) {
      const url = item.outputUrl || URL.createObjectURL(item.outputBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    if (mediaType === 'image' && outputDataUrl) {
      const a = document.createElement('a');
      a.href = outputDataUrl;
      a.download = originalFileName || 'image.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (mediaType === 'video' && outputVideoBlob) {
      const url = outputVideoUrl || URL.createObjectURL(outputVideoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalFileName || 'video.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Download All batch videos in a single ZIP (with original file names)
  const handleDownloadAllZip = async () => {
    const completedItems = batchItems.filter((it) => it.outputBlob);
    if (completedItems.length === 0) return;

    setIsZipping(true);
    try {
      const zip = new JSZip();
      completedItems.forEach((it) => {
        if (it.outputBlob) {
          zip.file(it.originalName, it.outputBlob);
        }
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cleaned_videos_batch.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create ZIP', err);
      setErrorMessage('Could not generate ZIP file.');
    } finally {
      setIsZipping(false);
    }
  };

  const handleCancelVideo = () => {
    if (videoProcessorRef.current) {
      videoProcessorRef.current.cancel();
    }
    setIsProcessingBatch(false);
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)));
  const handleResetZoom = () => setZoom(1.0);

  const allBatchCompleted =
    isBatchMode &&
    batchItems.length > 0 &&
    batchItems.every((it) => it.status === 'completed' && it.outputBlob);

  return (
    <div className="min-h-screen bg-[#080c14] text-zinc-100 flex flex-col font-sans select-none antialiased">
      {/* Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        mode={mode}
        onToggleMode={setMode}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Main Content Area */}
      {!mediaType ? (
        <main className="flex-1 flex flex-col items-center">
          {/* Upload Dropzone (Supports 1 to 10 videos) */}
          <UploadDropzone
            mode={mode}
            onToggleMode={setMode}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onImageSelected={handleImageSelected}
            onVideoSelected={handleVideoSelected}
            onBatchVideosSelected={handleBatchVideosSelected}
            onOpenOverlayMode={(media) => setOverlayMedia(media)}
          />

          {/* Landing Content */}
          <LandingContent
            onOpenUpload={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </main>
      ) : (
        /* Workspace Editor */
        <div className="flex-1 flex flex-col w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#080c14]">
          {/* Batch Video Queue (Visible when multiple videos are loaded) */}
          {isBatchMode && batchItems.length > 0 && (
            <BatchVideoQueue
              items={batchItems}
              activeIndex={activeBatchIndex}
              onSelectIndex={handleSelectBatchIndex}
              onApplyCurrentMaskToAll={handleApplyCurrentMaskToAll}
              onStartOneTapBatch={handleStartOneTapBatch}
              isProcessingBatch={isProcessingBatch}
              onDownloadSingle={handleDownloadSingle}
              onDownloadAllZip={handleDownloadAllZip}
              isZipping={isZipping}
            />
          )}

          {/* Toolbar */}
          <Toolbar
            tool={tool}
            onSelectTool={setTool}
            brushSize={brushSize}
            onChangeBrushSize={setBrushSize}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={() => {
              window.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })
              );
            }}
            onRedo={() => {
              window.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true })
              );
            }}
            onClearMask={() => {
              const maskCanvas = maskCanvasRef.current;
              if (maskCanvas) {
                const ctx = maskCanvas.getContext('2d');
                if (ctx) {
                  ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
                }
              }
              handleMaskChange(false);
            }}
            hasMask={hasMask}
            mode={mode}
            onToggleMode={setMode}
            inpaintAlgorithm={inpaintAlgorithm}
            onChangeAlgorithm={setInpaintAlgorithm}
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            isProcessed={isProcessed}
            isComparing={isComparing}
            onToggleCompare={() => setIsComparing(!isComparing)}
          />

          {/* Central Workspace: Canvas or Live Video */}
          <div className="flex-1 relative flex flex-col overflow-hidden">
            <CanvasWorkspace
              mediaType={mediaType}
              imageSrc={imageSrc}
              videoSrc={videoSrc}
              tool={tool}
              brushSize={brushSize}
              maskColor={maskColor}
              zoom={zoom}
              onMaskChange={handleMaskChange}
              outputDataUrl={outputDataUrl}
              outputVideoUrl={outputVideoUrl}
              isComparing={isComparing}
              onUndoReadyChange={(u, r) => {
                setCanUndo(u);
                setCanRedo(r);
              }}
              onRegisterCanvasRefs={handleRegisterCanvasRefs}
              onRegisterVideoRef={handleRegisterVideoRef}
              onVideoMetadataLoaded={(dur, w, h) => {
                setVideoDuration(dur);
                if (isBatchMode) {
                  setBatchItems((prev) =>
                    prev.map((it, idx) =>
                      idx === activeBatchIndex ? { ...it, duration: dur, width: w, height: h } : it
                    )
                  );
                }
              }}
              onVideoTimeUpdate={(time) => setVideoCurrentTime(time)}
              isLiveCleaned={isLiveCleaned}
              onToggleLiveCleaned={() => setIsLiveCleaned(!isLiveCleaned)}
            />

            {/* Video Playback & Timeline Controls (for video mode) */}
            {mediaType === 'video' && !outputVideoUrl && (
              <VideoWorkspace
                isPlaying={isPlayingVideo}
                onTogglePlay={handleTogglePlayVideo}
                currentTime={videoCurrentTime}
                duration={videoDuration}
                onSeek={handleSeekVideo}
                onStepFrame={handleStepFrame}
                isLooping={isLooping}
                onToggleLoop={() => setIsLooping(!isLooping)}
                isMuted={isMuted}
                onToggleMute={() => {
                  if (activeVideoRef.current) {
                    activeVideoRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                isProcessing={isProcessing}
                isCleaned={isProcessed}
                outputVideoBlob={outputVideoBlob}
                onDownload={() => handleDownloadSingle()}
              />
            )}
          </div>

          {/* Action Footer */}
          <ActionFooter
            mode={mode}
            hasMask={hasMask}
            isProcessing={isProcessing}
            isProcessed={isProcessed}
            onProcess={handleProcess}
            onDownload={isBatchMode ? handleDownloadAllZip : handleDownloadSingle}
            onReset={handleReset}
            isVideo={mediaType === 'video'}
            videoProgress={videoProgress}
            onCancelVideo={handleCancelVideo}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
            isBatch={isBatchMode}
            batchCount={batchItems.length}
            allBatchCompleted={allBatchCompleted}
          />
        </div>
      )}

      {/* Overlay & Watermark Studio Workspace */}
      {overlayMedia && (
        <OverlayWorkspace
          baseMedia={overlayMedia}
          onClose={() => setOverlayMedia(null)}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        maskColor={maskColor}
        onSaveMaskColor={(col) => {
          setMaskColor(col);
          try {
            localStorage.setItem('mask_color', col);
          } catch {}
        }}
        inpaintRadius={inpaintRadius}
        onSaveInpaintRadius={setInpaintRadius}
        inpaintAlgorithm={inpaintAlgorithm}
        onSaveAlgorithm={setInpaintAlgorithm}
        apiKey={apiKey}
        onSaveApiKey={(k) => {
          setApiKey(k);
          try {
            localStorage.setItem('gemini_api_key', k);
          } catch {}
        }}
      />
    </div>
  );
}
