/**
 * Generates a realistic sample photo with a visible watermark
 * so users can test watermark removal without uploading files.
 */
export function createSampleImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Draw a rich scenic landscape background (Sunset over mountains and lake)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 400);
  skyGrad.addColorStop(0, '#0f172a'); // deep indigo twilight
  skyGrad.addColorStop(0.3, '#312e81');
  skyGrad.addColorStop(0.6, '#db2777'); // vibrant pink magenta
  skyGrad.addColorStop(0.85, '#f59e0b'); // amber gold
  skyGrad.addColorStop(1, '#fed7aa'); // warm peach
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 960, 420);

  // Glowing Sun
  const sunGrad = ctx.createRadialGradient(480, 320, 10, 480, 320, 120);
  sunGrad.addColorStop(0, '#ffffff');
  sunGrad.addColorStop(0.3, '#fef08a');
  sunGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.4)');
  sunGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(480, 320, 120, 0, Math.PI * 2);
  ctx.fill();

  // Distant mountain silhouettes
  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.moveTo(0, 380);
  ctx.lineTo(140, 240);
  ctx.lineTo(280, 350);
  ctx.lineTo(460, 200);
  ctx.lineTo(600, 330);
  ctx.lineTo(750, 220);
  ctx.lineTo(960, 360);
  ctx.lineTo(960, 420);
  ctx.lineTo(0, 420);
  ctx.closePath();
  ctx.fill();

  // Closer forest/hills
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.moveTo(0, 420);
  ctx.lineTo(200, 350);
  ctx.lineTo(380, 390);
  ctx.lineTo(620, 340);
  ctx.lineTo(840, 380);
  ctx.lineTo(960, 350);
  ctx.lineTo(960, 420);
  ctx.lineTo(0, 420);
  ctx.closePath();
  ctx.fill();

  // Calm reflective water lake
  const waterGrad = ctx.createLinearGradient(0, 420, 0, 640);
  waterGrad.addColorStop(0, '#1e1b4b');
  waterGrad.addColorStop(0.3, '#312e81');
  waterGrad.addColorStop(0.7, '#1e293b');
  waterGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, 420, 960, 220);

  // Subtle water ripples
  ctx.strokeStyle = 'rgba(254, 215, 170, 0.25)';
  ctx.lineWidth = 1.5;
  for (let y = 430; y < 630; y += 18) {
    ctx.beginPath();
    ctx.moveTo(480 - (y - 420) * 1.8, y);
    ctx.lineTo(480 + (y - 420) * 1.8, y);
    ctx.stroke();
  }

  // 2. Realistic watermark stamps:
  // Watermark A: Bottom-Right copyright stamp
  ctx.save();
  ctx.font = 'bold 24px -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 6;
  ctx.fillText('SHUTTERSTOCK  © SAMPLE', 610, 595);

  // Watermark Icon symbol next to text
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(575, 574, 24, 24);
  ctx.beginPath();
  ctx.arc(587, 586, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Watermark B: Center diagonal repeating watermark
  ctx.save();
  ctx.translate(480, 320);
  ctx.rotate(-Math.PI / 8);
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.textAlign = 'center';
  ctx.fillText('PREVIEW • WATERMARK • DO NOT COPY', 0, 0);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * Generates an animated sample video with a moving background and static watermark
 * so users can test video watermark inpainting instantly.
 */
export async function createSampleVideoBlob(): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d')!;

  const fps = 20;
  const totalFrames = 40; // 2 seconds clip
  const stream = (canvas as any).captureStream ? (canvas as any).captureStream(fps) : (canvas as any).mozCaptureStream(fps);

  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, { mimeType });
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  for (let f = 0; f < totalFrames; f++) {
    const t = f / totalFrames;

    // Draw animated gradient
    const grad = ctx.createLinearGradient(0, 0, 640, 360);
    grad.addColorStop(0, `hsl(${Math.round(200 + t * 60)}, 70%, 25%)`);
    grad.addColorStop(1, `hsl(${Math.round(280 + t * 60)}, 60%, 15%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 360);

    // Floating orb
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    const orbX = 120 + Math.sin(t * Math.PI * 2) * 80;
    const orbY = 180 + Math.cos(t * Math.PI * 2) * 50;
    ctx.arc(orbX, orbY, 60, 0, Math.PI * 2);
    ctx.fill();

    // Secondary colored shape
    ctx.fillStyle = 'rgba(244, 63, 94, 0.3)';
    ctx.beginPath();
    ctx.arc(450 - Math.sin(t * Math.PI * 2) * 60, 150, 45, 0, Math.PI * 2);
    ctx.fill();

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 640; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 360);
      ctx.stroke();
    }

    // Static Watermark at bottom-right
    ctx.save();
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText('VIDEO_DEMO © WATERMARK', 310, 325);
    ctx.restore();

    await new Promise((r) => setTimeout(r, 1000 / fps));
  }

  recorder.stop();

  return new Promise((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }));
    };
  });
}

