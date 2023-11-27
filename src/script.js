import './style.css'
import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import textObject from '../assets/gltf/test2.gltf';
import textObjectData from '../assets/gltf/test2_data.bin';
import { GUI } from 'dat.gui'

export default class ThreeJsDraft {
  constructor() {
    /**
     * Variables
     */
    this.canvas = document.querySelector('canvas.webgl')
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.devicePixelRatio = window.devicePixelRatio;
    this.time = 0;

    /**
     * Scene
     */
    this.scene = new THREE.Scene()

    /**
     * Camera
     */
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000)
    this.camera.position.z = 0.5
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    /**
     * Renderer
     */
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas
    })
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(Math.min(this.devicePixelRatio, 2))
    this.renderer.setClearColor(0xfafaff);

    /**
     * Resize
     */
    window.addEventListener('resize', () => {
      this.width = window.innerWidth
      this.height = window.innerHeight
      this.camera.aspect = this.width / this.height
      this.camera.updateProjectionMatrix()

      this.devicePixelRatio = window.devicePixelRatio

      this.renderer.setSize(this.width, this.height)
      this.renderer.setPixelRatio(Math.min(this.devicePixelRatio, 2))

    }, false)

    /**
     * Loading Manager
     */
    this.loadingManager = new THREE.LoadingManager()

    this.loadingManager.onStart = function (url, itemsLoaded, itemsTotal) {
      console.log('Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.')
    }

    this.loadingManager.onLoad = function () {
      console.log('Loading complete!')
    }

    this.loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
      console.log('Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.')
    }

    this.loadingManager.onError = function (url) {
      console.log('There was an error loading ' + url)
    }

    /**
     * Load Assets
     */
    this.loadAssets()

    /**
     * Helpers
     */
    this.addHelpers()

    /**
     * Objects
     */
    this.addObjects()

    /**
     * Event Listeners
     */
    this.addEventListeners();

    /**
     * Animation Loop
     */
    this.animate()
  }

  addEventListeners() {
    this.raycaster = new THREE.Raycaster();
    this.touchTarget = null;
    this.isDragging = false;

    this.touchTarget = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.MeshBasicMaterial()
    );

    document.addEventListener('mousedown', (event) => {
      const x = 2 * (event.clientX / this.width) - 1;
      const y = -2 * (event.clientY / this.height) + 1;
      this.raycaster.setFromCamera({ x, y }, this.camera);
      const intersect = this.raycaster.intersectObject(this.cube);
      console.log(intersect);
      if (intersect.length) {
        this.isDragging = true;
        this.cubeMaterial.uniforms.uDragRelease.value = false;
        const startPosition = intersect[0].point;
        this.cubeMaterial.uniforms.uDragStart.value.copy(startPosition);
        this.cubeMaterial.uniforms.uDragTarget.value.copy(startPosition);
      }
    });

    document.addEventListener('mousemove', (event) => {
      if (!this.isDragging) return;
      const x = 2 * (event.clientX / this.width) - 1;
      const y = -2 * (event.clientY / this.height) + 1;
      this.raycaster.setFromCamera({ x, y }, this.camera);
      const intersect = this.raycaster.intersectObject(this.touchTarget);
      if (intersect.length) {
        const target = intersect[0].point;
        this.cubeMaterial.uniforms.uDragTarget.value.copy(target);
      }
    });

    document.addEventListener('mouseup', () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.cubeMaterial.uniforms.uDragReleaseTime.value = this.time;
      this.cubeMaterial.uniforms.uDragRelease.value = true;
    });
  }

  loadAssets() {
    this.cubeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uDragStart: { value: new THREE.Vector3() },
        uDragTarget: { value: new THREE.Vector3() },
        uDragRelease: { value: 0 },
        uDragReleaseTime: { value: 0 },
        uTime: { value: 0 },
        uInfluence: { value: 0.3 },
        uReleaseAmplitude: { value: 0.5 },
        uReleaseDistortion: { value: 30 },
        uZDistanceFactor: { value: 0.5 },
        uReleaseDistortionFactor: { value: 1 },
        uReleaseExpFactor: { value: -3 },
        uDistortionFactor: { value: 0.5 },
        uDistortionExpFactor: { value: -2.2 },
      },
      vertexShader: `
      uniform vec3 uDragStart;
      uniform vec3 uDragTarget;
      uniform float uDragRelease;
      uniform float uDragReleaseTime;
      uniform float uTime;
      uniform float uInfluence;
      uniform float uReleaseAmplitude;
      uniform float uReleaseDistortion;
      uniform float uZDistanceFactor;
      uniform float uReleaseDistortionFactor;
      uniform float uReleaseExpFactor;
      uniform float uDistortionFactor;
      uniform float uDistortionExpFactor;

      varying float vDistortion;
      
      void main() {
          float startToTarget = distance(uDragTarget, uDragStart);
          float distanceToStart = distance(position, uDragStart);
          float influence = distanceToStart / (uInfluence * startToTarget);
          float distortion = uDistortionFactor * exp(influence * uDistortionExpFactor);

          if (uDragRelease > 0.) {
            float timeSinceRelease = uTime - uDragReleaseTime;
            distortion *= uReleaseDistortionFactor * exp(uReleaseExpFactor * timeSinceRelease);
            distortion *= uReleaseAmplitude * sin(timeSinceRelease * uReleaseDistortion);
          }

          vec3 stretch = (uDragTarget - uDragStart) * distortion;

          vec3 newPosition = position;

          newPosition += stretch;
          newPosition.z += distanceToStart * uZDistanceFactor * distortion;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.);

          vDistortion = distortion;
      }
      `,
      fragmentShader: `
      varying float vDistortion;

      void main() {
        gl_FragColor = vec4(vDistortion, 0., 0., 1.);
      }
      `
    });

    const gltfLoader = new GLTFLoader(this.loadingManager);

    gltfLoader.load(textObject, (gltf) => {
      this.scene.add(gltf.scene);

      gltf.scene.children[0].material = this.cubeMaterial;

      this.cube = gltf.scene;
    });
  }

  addHelpers() {
    const axisHelper = new THREE.AxesHelper(3)
    //this.scene.add(axisHelper)

    this.stats = Stats()
    document.body.appendChild(this.stats.dom)

    const gui = new GUI()
    const cubeFolder = gui.addFolder('Cube')
    cubeFolder.add(this.cubeMaterial.uniforms.uInfluence, 'value', 0, 1).name('Influence');
    cubeFolder.add(this.cubeMaterial.uniforms.uZDistanceFactor, 'value', 0, 5).name('Z-Distance Factor');
    cubeFolder.add(this.cubeMaterial.uniforms.uReleaseAmplitude, 'value', 0, 3).name('Release Amplitude');
    cubeFolder.add(this.cubeMaterial.uniforms.uReleaseDistortion, 'value', 0, 100).name('Release Distortion');
    cubeFolder.add(this.cubeMaterial.uniforms.uReleaseDistortionFactor, 'value', 1, 5).name('Release Distortion Factor');
    cubeFolder.add(this.cubeMaterial.uniforms.uReleaseExpFactor, 'value', -10, 0).name('Release Exp Factor');
    cubeFolder.add(this.cubeMaterial.uniforms.uDistortionFactor, 'value', 0, 3).name('Distortion Factor');
    cubeFolder.add(this.cubeMaterial.uniforms.uDistortionExpFactor, 'value', -10, 0).name('Distortion Exp Factor');
    cubeFolder.open()
  }

  addObjects() {

  }

  animate() {
    this.stats.update();
    this.time += 0.01633;
    this.cubeMaterial.uniforms.uTime.value = this.time;
    this.renderer.render(this.scene, this.camera);
    window.requestAnimationFrame(this.animate.bind(this))
  }
}


/**
 * Create ThreeJsDraft
 */
// eslint-disable-next-line no-new
new ThreeJsDraft()
