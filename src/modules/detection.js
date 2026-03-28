export function initDetection(onResultsCallback, getLowPerfMode) {
  const Hands = window.Hands;
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const updateOptions = () => {
    const lowPerf = getLowPerfMode();
    hands.setOptions({
      selfieMode: false,
      maxNumHands: lowPerf ? 1 : 2,          // En modo bajo solo una mano
      modelComplexity: isMobile ? 0 : (lowPerf ? 0 : 1),
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  };

  updateOptions();

  hands.onResults((results) => {
    onResultsCallback(results);
  });

  return {
    hands,
    updateOptions,
  };
}