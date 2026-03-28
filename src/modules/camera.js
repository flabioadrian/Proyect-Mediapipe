export function initCamera(videoElement, onFrameCallback) {
  const Camera = window.Camera;
  const webcam = new Camera(videoElement, {
    onFrame: async () => {
      await onFrameCallback();
    },
    facingMode: 'user' // Asegura que use la cámara frontal
  });
  webcam.start();
  return webcam;
}