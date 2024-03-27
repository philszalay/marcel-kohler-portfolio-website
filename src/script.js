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
    this.objectMaterialMetalness = { value: 0.5 }
    this.objectMaterialRoughness = { value: 0.5 }

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

    document.addEventListener('click', (event) => {
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
        uAmplitude: { value: 0.01 },
        uRange: { value: 2 },
        uWaveSize: { value: 30 },
        uDecayFactor: { value: 1 },
        uWaveFactor: { value: 0.5 },
        uNewNormalTangentFactor: { value: 0.01 },
        uRippleZFactor: { value: 1 },
        uRippleXFactor: { value: 0 },
        uRippleYFactor: { value: 0 }
      },
      vertexShader: `
      uniform vec3 uClickPositions[3];
      uniform float uClickPositionTimes[3];
      uniform float uAmplitude;
      uniform float uRange;
      uniform float uWaveSize;
      uniform float uDecayFactor;
      uniform float uWaveFactor;
      uniform float uNewNormalTangentFactor;
      uniform float uRippleZFactor;
      uniform float uRippleXFactor;
      uniform float uRippleYFactor;

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

      float calcRippleEffect(vec3 position, vec3 clickPosition, float clickPositionTime) {
        float distance = distance(position, clickPosition);
        float rippleEffect = -uAmplitude * exp(uRange * - distance) * cos(uWaveSize * (distance - clickPositionTime)) * exp(-clickPositionTime + uDecayFactor) * cos(uWaveFactor * clickPositionTime);
        return rippleEffect;
      }

      vec3 orthogonal(vec3 v) {
        return normalize(abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0)
        : vec3(0.0, -v.z, v.y));
      }
      
      vec3 calculateNewNormal(vec3 oldPosition, vec3 newPosition, vec3 oldNormal, vec3 clickPosition, float clickPositionTime) {
        float tangentFactor = uNewNormalTangentFactor;

        vec3 tangent1 = orthogonal(oldNormal);
        vec3 tangent2 = normalize(cross(oldNormal, tangent1));
        vec3 nearby1 = oldPosition + tangent1 * tangentFactor;
        vec3 nearby2 = oldPosition + tangent2 * tangentFactor;

        float rippleEffectNearby1 = calcRippleEffect(nearby1, clickPosition, clickPositionTime);
        float rippleEffectNearby2 = calcRippleEffect(nearby2, clickPosition, clickPositionTime);

        vec3 distorted1 = vec3(nearby1.x + rippleEffectNearby1 * uRippleXFactor, nearby1.y + rippleEffectNearby1 * uRippleYFactor, nearby1.z + rippleEffectNearby1 * uRippleZFactor);
        vec3 distorted2 = vec3(nearby2.x + rippleEffectNearby2 * uRippleXFactor, nearby2.y + rippleEffectNearby2 * uRippleYFactor, nearby2.z + rippleEffectNearby2 * uRippleZFactor);

        return cross(distorted1 - newPosition, distorted2 - newPosition);
      }

      void main() {
        #include <uv_vertex>
        #include <color_vertex>
        #include <morphcolor_vertex>
      
        #include <beginnormal_vertex>
        #include <morphnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>

        // position calculation and normals
        vec3 transformedNormal = objectNormal;

        vec3 totalRippleEffect = vec3(0.);

        for (int i = 0; i < 3; i++) {
          if (uClickPositions[i] != vec3(0.)) {
            totalRippleEffect += calcRippleEffect(position, uClickPositions[i], uClickPositionTimes[i]);
          }
        }
        
        vec3 newPosition = vec3(position.x + totalRippleEffect.x * uRippleXFactor, position.y + totalRippleEffect.y * uRippleYFactor, position.z + totalRippleEffect.z * uRippleZFactor);

        for (int i = 0; i < 3; i++) {
          if (uClickPositions[i] != vec3(0.)) {
            //transformedNormal += calculateNewNormal(position, newPosition, objectNormal, uClickPositions[i], uClickPositionTimes[i]);
          }
        }

        #ifndef FLAT_SHADED // normal is computed with derivatives when FLAT_SHADED

        vNormal = normalize( transformedNormal );
      
        #ifdef USE_TANGENT
      
          vTangent = normalize( transformedTangent );
          vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
      
        #endif
      
      #endif

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
    waveFolder.add(this.cubeMaterial.uniforms.uRange, 'value', 1, 10).name('Range')
    waveFolder.add(this.cubeMaterial.uniforms.uWaveSize, 'value', 10, 60).name('Wave Size')
    waveFolder.add(this.cubeMaterial.uniforms.uDecayFactor, 'value', 0.1, 3).name('Decay Factor')
    waveFolder.add(this.cubeMaterial.uniforms.uWaveFactor, 'value', 0.1, 1).name('Wave Factor')
    waveFolder.add(this.cubeMaterial.uniforms.uRippleZFactor, 'value', -1, 1).name('Ripple Z Factor')
    waveFolder.add(this.cubeMaterial.uniforms.uRippleXFactor, 'value', -1, 1).name('Ripple X Factor')
    waveFolder.add(this.cubeMaterial.uniforms.uRippleYFactor, 'value', -1, 1).name('Ripple Y Factor')
    lightFolder.add(this.cubeMaterial.uniforms.uNewNormalTangentFactor, 'value', 0.001, 0.5).name('New Normal Tangent Factor')
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
