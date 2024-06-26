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
import vertexShader from './shaders/vertexShader.glsl'

export default class ThreeJsDraft {
  constructor () {
    /**
     * Variables
     */
    this.canvas = document.querySelector('canvas.webgl')
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.devicePixelRatio = window.devicePixelRatio

    this.timeSpeed = { value: 0.004 }
    this.objectMaterialMetalness = { value: 0.1 }
    this.objectMaterialRoughness = { value: 0 }

    this.MAX_CLICK_POSITIONS = 3

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

    document.addEventListener('mousedown', (event) => {
      const x = 2 * (event.clientX / this.width) - 1
      const y = -2 * (event.clientY / this.height) + 1
      this.raycaster.setFromCamera({ x, y }, this.camera)
      const intersect = this.raycaster.intersectObject(this.cube)
      if (intersect.length) {
        const startPosition = intersect[0].point
        this.cubeMaterial.uniforms.uClickPositions.value.unshift(startPosition)
        this.cubeMaterial.uniforms.uClickPositionTimes.value.unshift(0)
      }
    })
  }

  loadAssets () {
    const rgbeLoader = new RGBELoader(this.loadingManager)

    this.cubeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uClickPositions: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
        uClickPositionTimes: { value: [0, 0, 0] },
        uAmplitude: { value: 0.037 },
        uRange: { value: 9 },
        uWaveSize: { value: 125 },
        uDecayFactor: { value: 7.4 },
        uNewNormalTangentFactor: { value: 0.001 },
        uRippleZFactor: { value: 1 },
        uRippleXFactor: { value: 0 },
        uRippleYFactor: { value: 0 },
        uExpansionFactorStart: { value: 2 },
        uExpansionFactorEnd: { value: 3.5 }
      },
      vertexShader
    })

    console.log('Current function:', '-' + this.cubeMaterial.uniforms.uAmplitude.value + ' * exp(' + this.cubeMaterial.uniforms.uRange.value + ' * (-x)) * cos(' + this.cubeMaterial.uniforms.uWaveSize.value + ' * (x - t)) * exp(-t + ' * this.cubeMaterial.uniforms.uDecayFactor.value)

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

        mainObjectMaterial.metalness = this.objectMaterialMetalness.value
        mainObjectMaterial.roughness = this.objectMaterialRoughness.value

        this.cube = gltf.scene
        // this.cube.rotation.y = 2

        console.log(this.cube)
      })
    })
  }

  addHelpers () {
    this.stats = Stats()
    document.body.appendChild(this.stats.dom)

    const gui = new GUI()
    const waveFolder = gui.addFolder('Wave')
    const objectFolder = gui.addFolder('Object')
    const lightFolder = gui.addFolder('Light')

    waveFolder.add(this.timeSpeed, 'value', 0, 0.03).name('Speed')
    waveFolder.add(this.cubeMaterial.uniforms.uAmplitude, 'value', 0, 0.05).name('Amplitude')
    waveFolder.add(this.cubeMaterial.uniforms.uRange, 'value', 0.5, 10).name('Range')
    waveFolder.add(this.cubeMaterial.uniforms.uWaveSize, 'value', 10, 150).name('Wave Size')
    waveFolder.add(this.cubeMaterial.uniforms.uDecayFactor, 'value', 0.1, 10).name('Decay Factor')
    waveFolder.add(this.cubeMaterial.uniforms.uRippleZFactor, 'value', -1, 1).name('Ripple Z Factor')
    waveFolder.add(this.cubeMaterial.uniforms.uRippleXFactor, 'value', -1, 1).name('Ripple X Factor')
    waveFolder.add(this.cubeMaterial.uniforms.uRippleYFactor, 'value', -1, 1).name('Ripple Y Factor')
    waveFolder.add(this.cubeMaterial.uniforms.uExpansionFactorStart, 'value', 1, 10).name('Expansion Start')
    waveFolder.add(this.cubeMaterial.uniforms.uExpansionFactorEnd, 'value', 1, 10).name('Expansion End')
    lightFolder.add(this.cubeMaterial.uniforms.uNewNormalTangentFactor, 'value', 0.0001, 0.01).name('New Normal Tangent Factor')
    objectFolder.add(this.objectMaterialMetalness, 'value', 0, 1).name('Metalness').onChange(() => {
      this.cube.children[0].material.metalness = this.objectMaterialMetalness.value
    })
    objectFolder.add(this.objectMaterialRoughness, 'value', 0, 1).name('Roughness').onChange(() => {
      this.cube.children[0].material.roughness = this.objectMaterialRoughness.value
    })

    waveFolder.open()
    objectFolder.open()
    lightFolder.open()
  }

  addObjects () {

  }

  addLights () {
  }

  animate () {
    this.stats.update()
    this.cubeMaterial.uniforms.uClickPositionTimes.value = this.cubeMaterial.uniforms.uClickPositionTimes.value.map((time) => time + this.timeSpeed.value)
    this.renderer.render(this.scene, this.camera)
    window.requestAnimationFrame(this.animate.bind(this))
  }
}

/**
 * Create ThreeJsDraft
 */
// eslint-disable-next-line no-new
new ThreeJsDraft()
