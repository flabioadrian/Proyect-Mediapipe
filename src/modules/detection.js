export function initDetection(onResultsCallback) {
  const Hands = window.Hands;
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  hands.setOptions({
    selfieMode: false,
    maxNumHands: 2,
    modelComplexity: isMobile ? 0 : 1, // Menos complejo para móviles
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

  hands.onResults((results) => {
    onResultsCallback(results); 
    });
  return hands;
}