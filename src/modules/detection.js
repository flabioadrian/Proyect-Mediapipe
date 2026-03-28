export function initDetection(onResultsCallback) {
  const Hands = window.Hands;
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    selfieMode: false,
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

  hands.onResults((results) => {
    onResultsCallback(results); 
    });
  return hands;
}