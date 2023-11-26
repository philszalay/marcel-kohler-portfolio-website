import './style.css'
import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { DragControls } from 'three/addons/controls/DragControls.js';
import EffectComposer, {
  RenderPass,
  ShaderPass,
} from '@johh/three-effectcomposer';

export default class ThreeJsDraft {
  constructor() {
    /**
     * Variables
     */
    this.canvas = document.querySelector('canvas.webgl')
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.devicePixelRatio = window.devicePixelRatio

    /**
     * Scene
     */
    this.scene = new THREE.Scene()

    /**
     * Camera
     */
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000)
    this.camera.position.z = 5

    /**
     * Renderer
     */
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas
    })
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(Math.min(this.devicePixelRatio, 2))

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
    const mouseMoveFunction = (e) => {
      // mousemove / touchmove
      this.uMouse.x = (e.clientX / window.innerWidth);
      this.uMouse.y = 1. - (e.clientY / window.innerHeight);
    }

    this.uMouse = new THREE.Vector2(0, 0)
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    document.addEventListener('mousedown', (e) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = - (e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);

      const intersects = this.raycaster.intersectObjects([this.cube]);

      console.log(intersects);

      if (intersects.length) {

        document.addEventListener('mousemove', mouseMoveFunction);
      }


    });

    document.addEventListener('mouseup', (e) => {
      document.removeEventListener('mousemove', mouseMoveFunction);
      this.uMouse.x = 0;
      this.uMouse.y = 0;
    });
  }

  loadAssets() {
    // const textureLoader = new THREE.TextureLoader(this.loadingManager)
  }

  addHelpers() {
    const axisHelper = new THREE.AxesHelper(3)
    //this.scene.add(axisHelper)

    this.stats = Stats()
    document.body.appendChild(this.stats.dom)
  }

  addObjects() {
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1, 16, 16, 16)
    const cubeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true
    })
    this.cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
    this.scene.add(this.cube)

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera, cubeMaterial);
    this.composer.addPass(renderPass);

    var myEffect = {
      uniforms: {
        "tDiffuse": { value: null },
        "resolution": { value: new THREE.Vector2(1., window.innerHeight / window.innerWidth) },
        "uMouse": { value: new THREE.Vector2(-10, -10) },
        "uVelo": { value: 0 },
      },
      vertexShader: `varying vec2 vUv;void main() {vUv = uv;gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );}`,
      fragmentShader: `uniform float time;
  uniform sampler2D tDiffuse;
  uniform vec2 resolution;
  varying vec2 vUv;
  uniform vec2 uMouse;
  float circle(vec2 uv, vec2 disc_center, float disc_radius, float border_size) {
    uv -= disc_center;
    uv*=resolution;
    float dist = sqrt(dot(uv, uv));
    return smoothstep(disc_radius+border_size, disc_radius-border_size, dist);
  }
  void main()  {
    vec2 newUV = vUv;
    float c = circle(vUv, uMouse, 0.0, 0.2);
    float r = texture2D(tDiffuse, newUV.xy += c * (0.1 * .5)).x;
    float g = texture2D(tDiffuse, newUV.xy += c * (0.1 * .525)).y;
    float b = texture2D(tDiffuse, newUV.xy += c * (0.1 * .55)).z;
    vec4 color = vec4(r, g, b, 1.);
    
    gl_FragColor = color;
  }`
    }

    this.customPass = new ShaderPass(myEffect);
    this.customPass.renderToScreen = true;
    this.composer.addPass(this.customPass);
  }

  animate() {
    this.customPass.uniforms.uMouse.value = this.uMouse;
    this.stats.update()
    this.composer.render()
    //this.renderer.render(this.scene, this.camera);
    window.requestAnimationFrame(this.animate.bind(this))
  }
}


/**
 * Create ThreeJsDraft
 */
// eslint-disable-next-line no-new
new ThreeJsDraft()
