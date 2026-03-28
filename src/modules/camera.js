export function initCamera(videoElement, onFrameCallback) {
  const Camera = window.Camera;
  const webcam = new Camera(videoElement, {
    onFrame: async () => {
      await onFrameCallback();
    },
    width: 640,
    height: 480
  });
  webcam.start();
  return webcam;
}