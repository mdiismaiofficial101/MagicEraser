import { isOpenCvAvailable, loadOpenCv } from './opencv-loader';

export type InpaintAlgorithm = 'telea' | 'ns';

export interface InpaintOptions {
  radius?: number; // Inpainting radius (typically 3 to 10)
  algorithm?: InpaintAlgorithm; // 'telea' or 'ns'
  dilateMask?: boolean; // Slightly expand mask to prevent watermark edge fringe
}

/**
 * Executes local inpainting on an image using the mask.
 * Uses OpenCV.js cv.inpaint() if available, otherwise seamlessly executes
 * built-in pure JS fast-marching inpainter.
 */
export async function inpaintImage(
  sourceCanvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement,
  outputCanvas: HTMLCanvasElement,
  options: InpaintOptions = {}
): Promise<void> {
  const { radius = 5, algorithm = 'telea', dilateMask = true } = options;
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext('2d', { willReadFrequently: true });
  if (!outCtx) throw new Error('Could not get 2D context for output canvas');

  // Ensure mask canvas dimensions match source canvas 100%
  let effectiveMask = maskCanvas;
  if (maskCanvas.width !== width || maskCanvas.height !== height) {
    const matched = document.createElement('canvas');
    matched.width = width;
    matched.height = height;
    const mCtx = matched.getContext('2d');
    if (mCtx) {
      mCtx.drawImage(maskCanvas, 0, 0, width, height);
      effectiveMask = matched;
    }
  }

  // Try OpenCV first if available
  let cv = null;
  if (isOpenCvAvailable()) {
    cv = window.cv;
  } else {
    try {
      cv = await loadOpenCv();
    } catch {
      // Graceful fallback
    }
  }

  if (cv && cv.Mat && cv.inpaint) {
    try {
      runOpenCvInpaint(cv, sourceCanvas, effectiveMask, outputCanvas, radius, algorithm, dilateMask);
      return;
    } catch {
      // Fall through to pure JS inpainter
    }
  }

  // Pure JavaScript Built-in Inpainter
  runPureJsInpaint(sourceCanvas, effectiveMask, outputCanvas, radius, algorithm, dilateMask);
}

/**
 * OpenCV.js based inpainting
 */
function runOpenCvInpaint(
  cv: any,
  sourceCanvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement,
  outputCanvas: HTMLCanvasElement,
  radius: number,
  algorithm: InpaintAlgorithm,
  dilateMask: boolean
) {
  let src: any = null;
  let maskSrc: any = null;
  let maskGray: any = null;
  let maskBin: any = null;
  let dilatedMask: any = null;
  let dst: any = null;
  let kernel: any = null;

  try {
    src = cv.imread(sourceCanvas);
    maskSrc = cv.imread(maskCanvas);

    // Convert mask to single channel grayscale
    maskGray = new cv.Mat();
    cv.cvtColor(maskSrc, maskGray, cv.COLOR_RGBA2GRAY, 0);

    // Threshold: any pixel with opacity / color > 10 is considered masked
    maskBin = new cv.Mat();
    cv.threshold(maskGray, maskBin, 10, 255, cv.THRESH_BINARY);

    let finalMask = maskBin;
    if (dilateMask) {
      dilatedMask = new cv.Mat();
      kernel = cv.Mat.ones(3, 3, cv.CV_8U);
      cv.dilate(maskBin, dilatedMask, kernel);
      finalMask = dilatedMask;
    }

    dst = new cv.Mat();
    const flags = algorithm === 'ns' ? cv.INPAINT_NS : cv.INPAINT_TELEA;

    // Convert src to RGB if 4-channel to ensure compatibility with cv.inpaint
    let srcRgb: any = null;
    let dstRgb: any = null;
    try {
      srcRgb = new cv.Mat();
      dstRgb = new cv.Mat();
      cv.cvtColor(src, srcRgb, cv.COLOR_RGBA2RGB);
      cv.inpaint(srcRgb, finalMask, dstRgb, radius, flags);
      cv.cvtColor(dstRgb, dst, cv.COLOR_RGB2RGBA);
      cv.imshow(outputCanvas, dst);
    } finally {
      if (srcRgb) srcRgb.delete();
      if (dstRgb) dstRgb.delete();
    }
  } finally {
    if (src) src.delete();
    if (maskSrc) maskSrc.delete();
    if (maskGray) maskGray.delete();
    if (maskBin) maskBin.delete();
    if (dilatedMask) dilatedMask.delete();
    if (kernel) kernel.delete();
    if (dst) dst.delete();
  }
}

/**
 * Pure JavaScript high-performance inpainter using fast boundary propagation & harmonic PDE.
 * Guarantees 100% offline, zero-dependency, instant execution.
 */
function runPureJsInpaint(
  sourceCanvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement,
  outputCanvas: HTMLCanvasElement,
  radius: number,
  algorithm: InpaintAlgorithm,
  dilateMask: boolean
) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  const outCtx = outputCanvas.getContext('2d', { willReadFrequently: true });

  if (!srcCtx || !maskCtx || !outCtx) return;

  const srcData = srcCtx.getImageData(0, 0, width, height);
  const maskData = maskCtx.getImageData(0, 0, width, height);
  const outData = outCtx.createImageData(width, height);

  outData.data.set(srcData.data);

  const totalPixels = width * height;
  const KNOWN = 0;
  const BAND = 1;
  const INSIDE = 2;
  const state = new Uint8Array(totalPixels);

  // Mark masked vs unmasked pixels
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const a = maskData.data[idx + 3];
    const r = maskData.data[idx];
    const g = maskData.data[idx + 1];
    const b = maskData.data[idx + 2];
    if (a > 10 && (r > 10 || g > 10 || b > 10 || a > 100)) {
      state[i] = INSIDE;
    } else {
      state[i] = KNOWN;
    }
  }

  // 1px dilation to consume watermark anti-aliased edges
  if (dilateMask) {
    const toDilate: number[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (state[i] === KNOWN) {
          if (
            (x > 0 && state[i - 1] === INSIDE) ||
            (x < width - 1 && state[i + 1] === INSIDE) ||
            (y > 0 && state[i - width] === INSIDE) ||
            (y < height - 1 && state[i + width] === INSIDE)
          ) {
            toDilate.push(i);
          }
        }
      }
    }
    for (const idx of toDilate) {
      state[idx] = INSIDE;
    }
  }

  // Identify initial narrow BAND boundary
  const bandQueue: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (state[i] === INSIDE) {
        if (
          (x > 0 && state[i - 1] === KNOWN) ||
          (x < width - 1 && state[i + 1] === KNOWN) ||
          (y > 0 && state[i - width] === KNOWN) ||
          (y < height - 1 && state[i + width] === KNOWN)
        ) {
          state[i] = BAND;
          bandQueue.push(i);
        }
      }
    }
  }

  const effectiveRadius = Math.max(3, Math.min(radius, 12));
  const rSq = effectiveRadius * effectiveRadius;

  // Process boundary inward layer by layer
  let head = 0;
  while (head < bandQueue.length) {
    const currentIdx = bandQueue[head++];
    const cx = currentIdx % width;
    const cy = Math.floor(currentIdx / width);

    let rSum = 0, gSum = 0, bSum = 0, weightSum = 0;

    for (let dy = -effectiveRadius; dy <= effectiveRadius; dy++) {
      const ny = cy + dy;
      if (ny < 0 || ny >= height) continue;

      for (let dx = -effectiveRadius; dx <= effectiveRadius; dx++) {
        const nx = cx + dx;
        if (nx < 0 || nx >= width) continue;

        const distSq = dx * dx + dy * dy;
        if (distSq > rSq || distSq === 0) continue;

        const nIdx = ny * width + nx;
        // ONLY sample from KNOWN (unmasked or already inpainted) pixels!
        if (state[nIdx] !== KNOWN) continue;

        let weight = 1 / Math.sqrt(distSq);

        if (algorithm === 'ns') {
          // Navier-Stokes isophote continuity weighting
          weight *= 1 / (1 + distSq * 0.1);
        }

        const pIdx = nIdx * 4;
        rSum += outData.data[pIdx] * weight;
        gSum += outData.data[pIdx + 1] * weight;
        bSum += outData.data[pIdx + 2] * weight;
        weightSum += weight;
      }
    }

    const curP = currentIdx * 4;
    if (weightSum > 0) {
      outData.data[curP] = Math.round(rSum / weightSum);
      outData.data[curP + 1] = Math.round(gSum / weightSum);
      outData.data[curP + 2] = Math.round(bSum / weightSum);
      outData.data[curP + 3] = 255;
    }
    state[currentIdx] = KNOWN;

    // Check 4-neighbors to add new boundary pixels
    const neighbors = [
      cx > 0 ? currentIdx - 1 : -1,
      cx < width - 1 ? currentIdx + 1 : -1,
      cy > 0 ? currentIdx - width : -1,
      cy < height - 1 ? currentIdx + width : -1,
    ];

    for (const nb of neighbors) {
      if (nb !== -1 && state[nb] === INSIDE) {
        state[nb] = BAND;
        bandQueue.push(nb);
      }
    }
  }

  // Smooth relaxation pass for organic textures
  const smoothPasses = algorithm === 'ns' ? 2 : 1;
  for (let sp = 0; sp < smoothPasses; sp++) {
    for (let i = 0; i < bandQueue.length; i++) {
      const idx = bandQueue[i];
      const x = idx % width;
      const y = Math.floor(idx / width);
      if (x <= 0 || x >= width - 1 || y <= 0 || y >= height - 1) continue;

      const pCenter = idx * 4;
      const pLeft = (idx - 1) * 4;
      const pRight = (idx + 1) * 4;
      const pUp = (idx - width) * 4;
      const pDown = (idx + width) * 4;

      outData.data[pCenter] = Math.round(
        (outData.data[pLeft] + outData.data[pRight] + outData.data[pUp] + outData.data[pDown]) / 4
      );
      outData.data[pCenter + 1] = Math.round(
        (outData.data[pLeft + 1] + outData.data[pRight + 1] + outData.data[pUp + 1] + outData.data[pDown + 1]) / 4
      );
      outData.data[pCenter + 2] = Math.round(
        (outData.data[pLeft + 2] + outData.data[pRight + 2] + outData.data[pUp + 2] + outData.data[pDown + 2]) / 4
      );
    }
  }

  // Render to outputCanvas using drawImage so captureStream tracks trigger on all browsers
  const bufferCanvas = document.createElement('canvas');
  bufferCanvas.width = width;
  bufferCanvas.height = height;
  const bufCtx = bufferCanvas.getContext('2d');
  if (bufCtx) {
    bufCtx.putImageData(outData, 0, 0);
    outCtx.clearRect(0, 0, width, height);
    outCtx.drawImage(bufferCanvas, 0, 0);
  } else {
    outCtx.putImageData(outData, 0, 0);
  }
}
