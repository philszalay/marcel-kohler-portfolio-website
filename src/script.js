import './style.css'
import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import textObject from '../assets/gltf/test.gltf'
import textObjectData from '../assets/gltf/test_data.bin'
import hdri from '../assets/hdri/main.hdr'
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
    this.time = 0
    this.dragZValue = 0

    /**
     * Scene
     */
    this.scene = new THREE.Scene()

    /**
     * Camera
     */
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000)
    this.camera.position.z = 1
    this.camera.lookAt(new THREE.Vector3(0, 0, 0))

    /**
     * Renderer
     */
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas
    })
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(Math.min(this.devicePixelRatio, 2))
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
  }

  loadAssets () {
    const rgbeLoader = new RGBELoader(this.loadingManager)

    const gltfLoader = new GLTFLoader(this.loadingManager)

    rgbeLoader.load(hdri, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      this.scene.environment = texture

      gltfLoader.load(textObject, (gltf) => {
        this.scene.add(gltf.scene)
        this.cube = gltf.scene
      })
    })
  }

  addHelpers () {
    this.stats = Stats()
    document.body.appendChild(this.stats.dom)
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
    this.renderer.render(this.scene, this.camera)
    window.requestAnimationFrame(this.animate.bind(this))
  }
}

/**
* Create ThreeJsDraft
*/
// eslint-disable-next-line no-new
new ThreeJsDraft()
