/**
 * Utility functions for robust Camera access in E-Ujian ANBK SMP Negeri 3 Kertek.
 * Provides resilient real camera acquisition with multi-tier fallback,
 * seamless stream attachment, and simulated virtual proctoring camera.
 */

export async function requestCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Browser ini tidak mendukung MediaDevices API untuk kamera.');
  }

  // Tier 1: User-facing webcam with standard 640x480 resolution
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
      },
      audio: false,
    });
  } catch (err1: any) {
    console.warn('Tier 1 camera constraints failed, attempting Tier 2:', err1);
  }

  // Tier 2: Width/Height without facingMode (for external USB cameras or specific drivers)
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    });
  } catch (err2: any) {
    console.warn('Tier 2 camera constraints failed, attempting Tier 3 simple video constraint:', err2);
  }

  // Tier 3: Simplest constraint { video: true } - maximum compatibility
  return await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });
}

/**
 * Creates an animated canvas video stream simulating proctoring camera
 * when physical webcam is absent or blocked during testing.
 */
export function createVirtualCameraStream(label: string = 'Siswa ANBK'): MediaStream {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');

  let frame = 0;
  const renderFrame = () => {
    if (!ctx) return;
    frame++;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid scanner
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Student silhouette
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.arc(160, 95, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(160, 190, 68, 48, 0, 0, Math.PI * 2);
    ctx.fill();

    // Radar scan sweep line
    const sweepY = (frame * 2.5) % canvas.height;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, sweepY);
    ctx.lineTo(canvas.width, sweepY);
    ctx.stroke();

    // ANBK Watermark / Status
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(18, 18, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('KAMERA AKTIF (ANBK)', 28, 22);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#94a3b8';
    const timeStr = new Date().toLocaleTimeString('id-ID');
    ctx.fillText(`${label} - ${timeStr}`, 12, canvas.height - 12);
  };

  renderFrame();
  const intervalId = setInterval(renderFrame, 80);

  const stream = canvas.captureStream(15);
  stream.getVideoTracks().forEach((track) => {
    const origStop = track.stop.bind(track);
    track.stop = () => {
      clearInterval(intervalId);
      origStop();
    };
  });

  return stream;
}

/**
 * Safely attaches a MediaStream to a video element and invokes play().
 */
export function attachStreamToVideo(
  videoEl: HTMLVideoElement | null,
  stream: MediaStream | null
) {
  if (!videoEl || !stream) return;
  if (videoEl.srcObject !== stream) {
    videoEl.srcObject = stream;
  }
  videoEl.play().catch((err) => {
    console.warn('Video auto-playback warning:', err);
  });
}
