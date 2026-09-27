// Utility for loading and checking OpenCV.js in the browser with silent fallback

declare global {
  interface Window {
    cv: any;
    Module?: any;
    onOpenCvReady?: () => void;
  }
}

let openCvPromise: Promise<any> | null = null;
let openCvAttempted = false;

export function loadOpenCv(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  if (window.cv && window.cv.Mat) {
    return Promise.resolve(window.cv);
  }

  if (openCvPromise) {
    return openCvPromise;
  }

  openCvPromise = new Promise((resolve) => {
    if (openCvAttempted) {
      resolve(window.cv && window.cv.Mat ? window.cv : null);
      return;
    }
    openCvAttempted = true;

    // Check if script is already present
    const existingScript = document.getElementById('opencv-js-script') as HTMLScriptElement | null;

    const checkReady = () => {
      if (window.cv && window.cv.Mat) {
        resolve(window.cv);
        return true;
      }
      return false;
    };

    if (checkReady()) return;

    window.Module = {
      onRuntimeInitialized: () => {
        resolve(window.cv);
      },
    };

    // If script already exists in DOM
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        setTimeout(() => checkReady() || resolve(null), 200);
      });
      existingScript.addEventListener('error', () => {
        resolve(null);
      });
      return;
    }

    const script = document.createElement('script');
    script.id = 'opencv-js-script';
    script.async = true;
    script.defer = true;
    script.src = 'https://docs.opencv.org/4.10.0/opencv.js';

    // Timeout safety: if OpenCV takes more than 4 seconds or is blocked by CSP, resolve gracefully
    const timeout = setTimeout(() => {
      if (!checkReady()) {
        resolve(null);
      }
    }, 4000);

    script.onload = () => {
      clearTimeout(timeout);
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (checkReady()) {
          clearInterval(interval);
        } else if (attempts > 30) {
          clearInterval(interval);
          resolve(null);
        }
      }, 100);
    };

    script.onerror = () => {
      clearTimeout(timeout);
      // Silently fall back to built-in pure JS engine without raising uncaught errors
      resolve(null);
    };

    try {
      document.body.appendChild(script);
    } catch {
      resolve(null);
    }
  });

  return openCvPromise;
}

export function isOpenCvAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.cv && !!window.cv.Mat;
}
