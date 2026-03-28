import { Scene3D } from './modules/scene3d.js';
import { initDetection } from './modules/detection.js';
import { initCamera } from './modules/camera.js';

const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas3d');
const loader = document.getElementById('loader');
const debugCanvas = document.getElementById('debug-canvas');
const debugCtx = debugCanvas.getContext('2d');
const handLabelsEl = document.getElementById('hand-labels');
const perfBtn = document.getElementById('perf-toggle');
let lowPerfMode = false;

debugCanvas.width = 640;
debugCanvas.height = 480;

const visualizer = new Scene3D(canvasElement);
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const multiplier = window.innerWidth < 600 ? 15 : 30;

// Inicializar detección con una función que devuelve lowPerfMode
const detection = initDetection((results) => {
  loader.style.display = 'none';

  // --- Debug solo si no estamos en modo bajo ---
  if (!lowPerfMode) {
    debugCtx.save();
    debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
    debugCtx.drawImage(results.image, 0, 0, debugCanvas.width, debugCanvas.height);

    let statusText = "";
    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const classification = results.multiHandedness[i];
        const isRightHand = classification.label === 'Right';

        window.drawConnectors(debugCtx, landmarks, window.HAND_CONNECTIONS, { color: isRightHand ? '#00FF00' : '#FF0000', lineWidth: 5 });
        window.drawLandmarks(debugCtx, landmarks, { color: '#FFFFFF', lineWidth: 2 });

        if (isRightHand) {
          statusText += "[IZQ: Activa] ";
        } else {
          statusText += "[DER: Activa] ";
        }
      }
    }
    handLabelsEl.innerText = statusText || "Buscando manos..." + (isMobile ? " (Móvil)" : " (Desktop)");
    debugCtx.restore();
  } else {
    debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
    handLabelsEl.innerText = "Modo ahorro energía";
  }

  // --- Lógica de control (siempre se ejecuta) ---
  let leftHandData = null;
  let rightHandData = null;

  if (results.multiHandLandmarks && results.multiHandedness) {
    results.multiHandLandmarks.forEach((landmarks, index) => {
      const label = results.multiHandedness[index].label;
      if (label === "Right") {
        leftHandData = landmarks;
      } else {
        rightHandData = landmarks;
      }
    });
  }

  let gesture = 'chaos';
  let targetPos = null;
  let rotation3D = null;

  if (leftHandData) {
    const indexExtended = leftHandData[8].y < leftHandData[6].y;
    const middleExtended = leftHandData[12].y < leftHandData[10].y;
    const ringFolded = leftHandData[16].y > leftHandData[14].y;
    const pinkyFolded = leftHandData[20].y > leftHandData[18].y;

    if (indexExtended && middleExtended && ringFolded && pinkyFolded) {
      gesture = 'heart';
    } else if (leftHandData[12].y > leftHandData[9].y && ringFolded && pinkyFolded) {
      gesture = 'sphere';
    } else {
      gesture = 'chaos';
    }

    targetPos = {
      x: (leftHandData[9].x - 0.5) * -multiplier,
      y: (leftHandData[9].y - 0.5) * -(multiplier * 0.7)
    };
  }

  if (rightHandData) {
    const indexExtended = rightHandData[8].y < rightHandData[6].y;
    const middleExtended = rightHandData[12].y < rightHandData[10].y;
    const ringFolded = rightHandData[16].y > rightHandData[14].y;
    const pinkyFolded = rightHandData[20].y > rightHandData[18].y;
    const isPeaceGesture = indexExtended && middleExtended && ringFolded && pinkyFolded;

    if (isPeaceGesture) {
      const fingerCenterX = (rightHandData[8].x + rightHandData[12].x) / 2;
      const fingerCenterY = (rightHandData[8].y + rightHandData[12].y) / 2;
      const baseCenterX = (rightHandData[5].x + rightHandData[9].x) / 2;
      const baseCenterY = (rightHandData[5].y + rightHandData[9].y) / 2;

      const tiltX = (fingerCenterY - baseCenterY) * 25;
      const tiltY = (fingerCenterX - baseCenterX) * 25;
      const p0 = rightHandData[0];
      const p9 = rightHandData[9];
      const tiltZ = Math.atan2(p9.y - p0.y, p9.x - p0.x) + Math.PI / 2;

      rotation3D = { x: tiltX, y: tiltY, z: tiltZ };
    }
  }

  visualizer.updateParticles(gesture, targetPos, rotation3D);
}, () => lowPerfMode);  // pasamos función para obtener lowPerfMode en tiempo real

// Frame skipping en la llamada a la cámara
let frameCounter = 0;
initCamera(videoElement, async () => {
  if (lowPerfMode) {
    frameCounter = (frameCounter + 1) % 3;
    if (frameCounter !== 0) return;  // Solo procesa 1 de cada 3 frames
  }
  await detection.hands.send({ image: videoElement });
});

// Botón de rendimiento
perfBtn.addEventListener('click', () => {
  lowPerfMode = !lowPerfMode;

  if (lowPerfMode) {
    perfBtn.innerText = "Modo: Ahorro Energía";
    perfBtn.classList.add('low-res');
    visualizer.setPerformanceMode(true);
  } else {
    perfBtn.innerText = "Modo: Alto Rendimiento";
    perfBtn.classList.remove('low-res');
    visualizer.setPerformanceMode(false);
  }

  // Actualizar opciones de MediaPipe (modelComplexity, maxNumHands)
  detection.updateOptions();
});

window.addEventListener('resize', () => visualizer.onResize());