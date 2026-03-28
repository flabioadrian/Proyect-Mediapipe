import * as THREE from 'three';

export class Scene3D {
  constructor(canvas) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Mantenemos la cámara a 25 para ver las formas bien, 
    // pero el caos se dispersará mucho más allá.
    this.camera.position.z = 25; 

    this.particleCount = 4000; // Aumentamos un poco más para que la dispersión se vea densa
    this.currentShape = 'chaos'; 
    this.targetPositions = new Float32Array(this.particleCount * 3);
    
    this.initParticles();
    this.animate();
  }

  // --- MATEMÁTICAS DE FORMAS ---

  // 1. EL NUEVO CAOS VISTOSO: Una Esfera Gigante y Dispersa
  getChaosPosition(index) {
    // Usamos coordenadas polares para asegurar una distribución esférica, 
    // pero con un radio aleatorio muy grande para la dispersión.
    
    // Distribución uniforme en una esfera
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    // RADIO GIGANTE ALEATORIO: Aquí está la clave.
    // Una base grande (80) + una variación aleatoria gigante (60).
    // Esto hace que cubra todo el campo de visión de la cámara.
    const radius = 80 + (Math.random() * 60); 

    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi) - 50 // Empujamos un poco hacia atrás para profundidad
    };
  }

  // 2. Esfera (Coordenadas polares compactas para la figura)
  getSpherePosition(index) {
    const phi = Math.acos(-1 + (2 * index) / this.particleCount);
    const theta = Math.sqrt(this.particleCount * Math.PI) * phi;
    const radius = 8; // Radio compacto para que sea una figura manipulable
    return {
      x: radius * Math.cos(theta) * Math.sin(phi),
      y: radius * Math.sin(theta) * Math.sin(phi),
      z: radius * Math.cos(phi)
    };
  }

  // 3. Corazón (Ecuación paramétrica 3D)
  getHeartPosition(index) {
    const t = (index / this.particleCount) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
    const z = (Math.random() - 0.5) * 2; 
    const scale = 0.8;
    return {
      x: x * scale,
      y: y * scale,
      z: z
    };
  }

  initParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    
    // Array para recordar las posiciones de "caos" esférico gigante
    this.chaosPositions = new Float32Array(this.particleCount * 3);
    
    for (let i = 0; i < this.particleCount; i++) {
        const pos = this.getChaosPosition(i);
        
        // Posición inicial
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;

        // Guardamos para volver a ellas
        this.chaosPositions[i * 3] = pos.x;
        this.chaosPositions[i * 3 + 1] = pos.y;
        this.chaosPositions[i * 3 + 2] = pos.z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Aumentamos ligeramente el tamaño y brillo para el caos
    const material = new THREE.PointsMaterial({ 
        color: 0xffffff, 
        size: 0.12, // Un poco más grandes para que se vean a lo lejos
        transparent: true, 
        opacity: 0.8,
        blending: THREE.AdditiveBlending 
    });
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const positions = this.particles.geometry.attributes.position.array;
    
    for (let i = 0; i < this.particleCount; i++) {
        let tx, ty, tz;

        if (this.currentShape === 'sphere') {
            const target = this.getSpherePosition(i);
            // Siguen a la mano
            tx = target.x + this.particles.position.x;
            ty = target.y + this.particles.position.y;
            tz = target.z;
            this.particles.material.color.setHex(0xffff00);
        } 
        else if (this.currentShape === 'heart') {
            const target = this.getHeartPosition(i);
            // Siguen a la mano
            tx = target.x + this.particles.position.x;
            ty = target.y + this.particles.position.y;
            tz = target.z;
            this.particles.material.color.setHex(0xff0000);
        } 
        else {
            // ESTADO CAOS GIGANTE: Vuelven a su dispersión masiva global
            tx = this.chaosPositions[i * 3];
            ty = this.chaosPositions[i * 3 + 1];
            tz = this.chaosPositions[i * 3 + 2];
            this.particles.material.color.setHex(0xaaaaaa); // Un blanco más tenue para dispersión
        }

        // Lerp Suavizado (mantén el 0.05 o bájalo un poco si quieres que 'vuelen' más lento)
        positions[i * 3] += (tx - positions[i * 3]) * 0.05;
        positions[i * 3 + 1] += (ty - positions[i * 3 + 1]) * 0.05;
        positions[i * 3 + 2] += (tz - positions[i * 3 + 2]) * 0.05;
    }
    
    this.particles.geometry.attributes.position.needsUpdate = true;
    
    // Rotación constante muy lenta del fondo
    this.particles.rotation.y += 0.0005; 
    this.renderer.render(this.scene, this.camera);
  }

  updateParticles(gesture, targetPos, rotationData) {
    this.currentShape = gesture;

    if (targetPos) {
        this.particles.position.x += (targetPos.x - this.particles.position.x) * 0.1;
        this.particles.position.y += (targetPos.y - this.particles.position.y) * 0.1;
    }

    if (rotationData) {
        const lerpFactor = 0.05;
        this.particles.rotation.x += (rotationData.x - this.particles.rotation.x) * lerpFactor;
        this.particles.rotation.y += (rotationData.y - this.particles.rotation.y) * lerpFactor;
        this.particles.rotation.z += (rotationData.z - this.particles.rotation.z) * lerpFactor;
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}