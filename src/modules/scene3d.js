import * as THREE from 'three';

export class Scene3D {
  constructor(canvas) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.isLowPerfMode = false;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    this.camera.position.z = 25;

    // Número máximo de partículas (para móvil o escritorio)
    this.maxParticleCount = isMobile ? 1500 : 4000;
    this.particleCount = this.maxParticleCount;
    this.currentShape = 'chaos';
    this.targetPositions = new Float32Array(this.particleCount * 3);
    
    this.initParticles();
    this.updateRenderSize(); // Configura el tamaño inicial
    this.animate();
  }

  updateRenderSize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const renderWidth = this.isLowPerfMode ? width * 0.5 : width;
    const renderHeight = this.isLowPerfMode ? height * 0.5 : height;
    
    this.renderer.setSize(renderWidth, renderHeight, false);
    // CSS: el canvas ocupa toda la pantalla (se estira)
    this.renderer.domElement.style.width = `${width}px`;
    this.renderer.domElement.style.height = `${height}px`;
    
    // La cámara debe proyectar al aspecto de la pantalla completa
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setPerformanceMode(isLow) {
    this.isLowPerfMode = isLow;
    this.updateRenderSize();  // Ajusta buffer y CSS según el nuevo modo
    
    if (isLow) {
      this.particleCount = 800;
      this.particles.material.size = 0.25;
    } else {
      this.particleCount = this.maxParticleCount;
      this.particles.material.size = 0.12;
    }
    this.particles.geometry.setDrawRange(0, this.particleCount);
    this.particles.material.needsUpdate = true;
  }

  // 1. CAOS: Una Esfera Gigante y Dispersa
  getChaosPosition(index) {
    // Distribución esférica aleatoria con radio grande
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const radius = 80 + (Math.random() * 60);
    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi) - 50
    };
  }

  getSpherePosition(index) {
    // Usamos `this.particleCount` para distribuir los puntos sobre toda la esfera
    const phi = Math.acos(-1 + (2 * index) / this.particleCount);
    const theta = Math.sqrt(this.particleCount * Math.PI) * phi;
    const radius = 8;
    return {
      x: radius * Math.cos(theta) * Math.sin(phi),
      y: radius * Math.sin(theta) * Math.sin(phi),
      z: radius * Math.cos(phi)
    };
  }

  // 3. Corazón (Ecuación paramétrica 3D)
  getHeartPosition(index) {
    // Usamos `this.particleCount` para distribuir los puntos a lo largo del corazón
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
    const positions = new Float32Array(this.maxParticleCount * 3);
    
    // Guardar posiciones de caos para todas las partículas posibles
    this.chaosPositions = new Float32Array(this.maxParticleCount * 3);
    
    for (let i = 0; i < this.maxParticleCount; i++) {
      const pos = this.getChaosPosition(i);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      this.chaosPositions[i * 3] = pos.x;
      this.chaosPositions[i * 3 + 1] = pos.y;
      this.chaosPositions[i * 3 + 2] = pos.z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.12,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
    // Inicialmente dibujamos todas
    this.particles.geometry.setDrawRange(0, this.particleCount);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.currentShape !== 'chaos' || this.particles.position.x !== 0) {
      const positions = this.particles.geometry.attributes.position.array;
      
      for (let i = 0; i < this.particleCount; i++) {
        let tx, ty, tz;

        if (this.currentShape === 'sphere') {
          const target = this.getSpherePosition(i);
          tx = target.x + this.particles.position.x;
          ty = target.y + this.particles.position.y;
          tz = target.z;
          this.particles.material.color.setHex(0xffff00);
        } 
        else if (this.currentShape === 'heart') {
          const target = this.getHeartPosition(i);
          tx = target.x + this.particles.position.x;
          ty = target.y + this.particles.position.y;
          tz = target.z;
          this.particles.material.color.setHex(0xff0000);
        } 
        else {
          // Estado caos: usamos las posiciones precalculadas
          tx = this.chaosPositions[i * 3];
          ty = this.chaosPositions[i * 3 + 1];
          tz = this.chaosPositions[i * 3 + 2];
          this.particles.material.color.setHex(0xaaaaaa);
        }

        positions[i * 3] += (tx - positions[i * 3]) * 0.05;
        positions[i * 3 + 1] += (ty - positions[i * 3 + 1]) * 0.05;
        positions[i * 3 + 2] += (tz - positions[i * 3 + 2]) * 0.05;
      }

      this.particles.geometry.attributes.position.needsUpdate = true;
    }
    
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