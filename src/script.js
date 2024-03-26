import './style.css'
import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import textObject from '../assets/gltf/test.gltf'
// eslint-disable-next-line no-unused-vars
import textObjectData from '../assets/gltf/test_data.bin'
import hdri from '../assets/hdri/main.hdr'
import { GUI } from 'dat.gui'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export default class ThreeJsDraft {
  constructor () {
    /**
     * Variables
     */
    this.canvas = document.querySelector('canvas.webgl')
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.devicePixelRatio = window.devicePixelRatio

    this.timeSpeed = { value: 0.01 }

    /**
     * Scene
     */
    this.scene = new THREE.Scene()

    /**
     * Camera
     */
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000)
    this.camera.position.z = 1

    /**
     * Renderer
     */
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas
    })
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(Math.min(this.devicePixelRatio, 2))
    // this.renderer.setClearColor(0xfafaff);
    this.renderer.outputEncoding = THREE.sRGBEncoding
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 3

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement)
    this.orbitControls.enabled = false

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
      this.renderer.toneMappingExposure = 5
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
     * Lights
     */
    this.addLights()

    /**
     * Event Listeners
     */
    this.addEventListeners()

    /**
     * Animation Loop
     */
    this.animate()
  }

  addEventListeners () {
    this.raycaster = new THREE.Raycaster()

    document.addEventListener('click', (event) => {
      const x = 2 * (event.clientX / this.width) - 1
      const y = -2 * (event.clientY / this.height) + 1
      this.raycaster.setFromCamera({ x, y }, this.camera)
      const intersect = this.raycaster.intersectObject(this.cube)
      if (intersect.length) {
        const startPosition = intersect[0].point
        this.cubeMaterial.uniforms.uClickPosition.value.copy(startPosition)
        this.cubeMaterial.uniforms.uTime.value = 0
      }
    })
  }

  loadAssets () {
    const rgbeLoader = new RGBELoader(this.loadingManager)

    this.cubeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uClickPosition: { value: new THREE.Vector3() },
        uTime: { value: 0 },
        uAmplitude: { value: 0.01 },
        uRange: { value: 5 },
        uWaveSize: { value: 30 },
        uDecayFactor: { value: 1 },
        uWaveFactor: { value: 0.5 }
      },
      vertexShader: `
      uniform vec3 uClickPosition;
      uniform float uTime;
      uniform float uAmplitude;
      uniform float uRange;
      uniform float uWaveSize;
      uniform float uDecayFactor;
      uniform float uWaveFactor;

      #define STANDARD

      varying vec3 vViewPosition;
      
      #ifdef USE_TRANSMISSION
      
        varying vec3 vWorldPosition;
      
      #endif
      
      #include <common>
      #include <uv_pars_vertex>
      #include <displacementmap_pars_vertex>
      #include <color_pars_vertex>
      #include <fog_pars_vertex>
      #include <normal_pars_vertex>
      #include <morphtarget_pars_vertex>
      #include <skinning_pars_vertex>
      #include <shadowmap_pars_vertex>
      #include <logdepthbuf_pars_vertex>
      #include <clipping_planes_pars_vertex>
      
      void main() {
        #include <uv_vertex>
        #include <color_vertex>
        #include <morphcolor_vertex>
      
        #include <beginnormal_vertex>
        #include <morphnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <defaultnormal_vertex>
        #include <normal_vertex>
      
        #include <begin_vertex>
        #include <morphtarget_vertex>
        #include <skinning_vertex>
        #include <displacementmap_vertex>
        #include <project_vertex>
        #include <logdepthbuf_vertex>
        #include <clipping_planes_vertex>
      
        vViewPosition = - mvPosition.xyz;
      
        #include <worldpos_vertex>
        #include <shadowmap_vertex>
        #include <fog_vertex>

        vec3 newPosition = position;

        if (uClickPosition.x != 0.) {
          float distance = distance(position, uClickPosition);

          float rippleEffect = -uAmplitude * exp(uRange * - distance) * cos(uWaveSize * (distance - uTime));

          float totalRippleEffect = exp(-uTime + uDecayFactor) * cos(uWaveFactor * uTime) * rippleEffect;

          newPosition.z += totalRippleEffect;
        }

        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.);

        #ifdef USE_TRANSMISSION
      
        vWorldPosition = worldPosition.xyz;
      
      #endif
      }
      `
    })

    const gltfLoader = new GLTFLoader(this.loadingManager)

    rgbeLoader.load(hdri, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      this.scene.environment = texture

      gltfLoader.load(textObject, (gltf) => {
        this.scene.add(gltf.scene)

        gltf.scene.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            // node.material.side = THREE.DoubleSide
          }
        })

        const mainObjectMaterial = gltf.scene.children[0].material

        mainObjectMaterial.onBeforeCompile = (shader) => {
          for (const key of Object.keys(this.cubeMaterial.uniforms)) {
            shader.uniforms[key] = this.cubeMaterial.uniforms[key]
          }

          shader.vertexShader = this.cubeMaterial.vertexShader
        }

        // mainObjectMaterial.metalness = 1;
        // mainObjectMaterial.roughness = 0.2;

        this.cube = gltf.scene
      })
    })
  }

  addHelpers () {
    this.stats = Stats()
    document.body.appendChild(this.stats.dom)

    const gui = new GUI()
    const cubeFolder = gui.addFolder('Cube')

    cubeFolder.add(this.timeSpeed, 'value', 0, 0.03).name('Speed')
    cubeFolder.add(this.cubeMaterial.uniforms.uAmplitude, 'value', 0, 0.05).name('Amplitude')
    cubeFolder.add(this.cubeMaterial.uniforms.uRange, 'value', 1, 10).name('Range')
    cubeFolder.add(this.cubeMaterial.uniforms.uWaveSize, 'value', 10, 60).name('Wave Size')
    cubeFolder.add(this.cubeMaterial.uniforms.uDecayFactor, 'value', 0.1, 3).name('Decay Factor')
    cubeFolder.add(this.cubeMaterial.uniforms.uWaveFactor, 'value', 0.1, 1).name('Wave Factor')
    cubeFolder.open()
  }

  addObjects () {

  }

  addLights () {
    const light = new THREE.PointLight(0xfafaff, 1, 100)
    light.position.set(0, 0, 5)
    light.position.set(1, 0, 15)
    light.position.set(0, 4, -5)
    light.position.set(-4, 1, -15)
    this.scene.add(light)
  }

  animate () {
    this.stats.update()
    this.cubeMaterial.uniforms.uTime.value += this.timeSpeed.value
    this.renderer.render(this.scene, this.camera)
    window.requestAnimationFrame(this.animate.bind(this))
  }
}

/**
 * Create ThreeJsDraft
 */
// eslint-disable-next-line no-new
new ThreeJsDraft()
