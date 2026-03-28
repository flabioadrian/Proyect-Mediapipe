import { Scene3D } from './modules/scene3d.js';
import { initDetection } from './modules/detection.js';
import { initCamera } from './modules/camera.js';

const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas3d');
const loader = document.getElementById('loader');
const debugCanvas = document.getElementById('debug-canvas');
const debugCtx = debugCanvas.getContext('2d');
const handLabelsEl = document.getElementById('hand-labels');

debugCanvas.width = 640;
debugCanvas.height = 480;

const visualizer = new Scene3D(canvasElement);

const hands = initDetection((results) => {
  loader.style.display = 'none';
  
  // --- LIMPIAR Y DIBUJAR EN EL MONITOR DE DEBUG ---
  debugCtx.save();
  debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
  // Dibujamos la imagen de la cámara de fondo en el monitor
  debugCtx.drawImage(results.image, 0, 0, debugCanvas.width, debugCanvas.height);

  let statusText = "";
  let leftHandData = null;
  let rightHandData = null;

  if (results.multiHandLandmarks && results.multiHandedness) {
    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
      const landmarks = results.multiHandLandmarks[i];
      const classification = results.multiHandedness[i];
      const isRightHand = classification.label === 'Right'; // Mano física IZQUIERDA (por espejo)

      // Dibujar los puntos y conexiones en el monitor
      window.drawConnectors(debugCtx, landmarks, window.HAND_CONNECTIONS, {color: isRightHand ? '#00FF00' : '#FF0000', lineWidth: 5});
      window.drawLandmarks(debugCtx, landmarks, {color: '#FFFFFF', lineWidth: 2});

      // Clasificación para la lógica
      if (isRightHand) {
        leftHandData = landmarks;
        statusText += "[IZQ: Activa] ";
      } else {
        rightHandData = landmarks;
        statusText += "[DER: Activa] ";
      }
    }
  }
  
  handLabelsEl.innerText = statusText || "Buscando manos...";
  debugCtx.restore();
  //Degub End

  // 1. Clasificamos las manos detectadas
  if (results.multiHandLandmarks && results.multiHandedness) {
    results.multiHandLandmarks.forEach((landmarks, index) => {
      // Ajustamos las etiquetas según el modo selfie (suele ser al revés)
      const label = results.multiHandedness[index].label; 
      if (label === "Right") { // Tu mano IZQUIERDA física
        leftHandData = landmarks;
      } else { // Tu mano DERECHA física
        rightHandData = landmarks;
      }
    });
  }

  let gesture = 'chaos';
  let targetPos = null;
  let rotation3D = null; // Cambiamos a rotation3D

  // 2. Lógica para la MANO IZQUIERDA (Gesto y Posición) - Sin Cambios
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
      x: (leftHandData[9].x - 0.5) * -30,
      y: (leftHandData[9].y - 0.5) * -20
    };
  }

  // 3. Lógica para la MANO DERECHA (Control Rotación 3D)
  if (rightHandData) {
    // A. Detectamos Gesto Activador: Signo de Paz ("V")
    const indexExtended = rightHandData[8].y < rightHandData[6].y;
    const middleExtended = rightHandData[12].y < rightHandData[10].y;
    const ringFolded = rightHandData[16].y > rightHandData[14].y;
    const pinkyFolded = rightHandData[20].y > rightHandData[18].y;
    const isPeaceGesture = indexExtended && middleExtended && ringFolded && pinkyFolded;

    if (isPeaceGesture) {
      // B. Calculamos Rotación en Ejes X e Y usando la inclinación de los dedos
      // Usamos el punto medio entre índice (8) y medio (12)
      const fingerCenterX = (rightHandData[8].x + rightHandData[12].x) / 2;
      const fingerCenterY = (rightHandData[8].y + rightHandData[12].y) / 2;
      
      // La base de los dedos (nudillos 5 y 9) como referencia
      const baseCenterX = (rightHandData[5].x + rightHandData[9].x) / 2;
      const baseCenterY = (rightHandData[5].y + rightHandData[9].y) / 2;

      // Inclinación Vertical -> Eje X
      const tiltX = (fingerCenterY - baseCenterY) * 25; // Sensibilidad
      
      // Inclinación Lateral -> Eje Y
      const tiltY = (fingerCenterX - baseCenterX) * 25; // Sensibilidad

      // C. Mantenemos Rotación Eje Z con ángulo de muñeca (0 a 9)
      const p0 = rightHandData[0]; // Muñeca
      const p9 = rightHandData[9]; // Nudillo Medio
      const tiltZ = Math.atan2(p9.y - p0.y, p9.x - p0.x) + Math.PI / 2;

      rotation3D = {
        x: tiltX,
        y: tiltY,
        z: tiltZ
      };
    }
  }

  // 4. Enviamos todo a la escena 3D
  visualizer.updateParticles(gesture, targetPos, rotation3D);
});

initCamera(videoElement, async () => {
  await hands.send({ image: videoElement });
});

window.addEventListener('resize', () => visualizer.onResize());