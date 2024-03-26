/* eslint-disable new-cap */
import './style.css'
import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import textObject from '../assets/gltf/test.gltf'
// eslint-disable-next-line no-unused-vars
import textObjectData from '../assets/gltf/test_data.bin'
import hdri from '../assets/hdri/main.hdr'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import Ammo from 'ammojs3'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'

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

    this.clock = new THREE.Clock()

    this.gravityConstant = -9.8
    this.physicsWorld = null
    this.rigidBodies = []
    this.softBodies = []
    this.margin = 0.05
    this.softBodyHelpers = null
    this.transformAux1 = null

    this.pos = new THREE.Vector3()
    this.quat = new THREE.Quaternion()

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
    this.camera.position.set(-7, 5, 8)

    /**
     * Ammo
     */
    this.ammo = null

    Ammo().then((ammo) => {
      this.ammo = ammo

      this.initPhysics()

      /**
     * Load Assets
     */
      this.loadAssets()

      /**
       * Objects
       */
      this.addObjects()

      /**
     * Helpers
     */
      this.addHelpers()

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
    }).catch((e) => {
      console.error(e)
    })

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
     * Click Handler
     */
    window.addEventListener('click', (event) => {
      console.log(this.ball)
      this.body.setLinearVelocity(new this.ammo.btVector3(-10, 35, 5))

      setTimeout(() => {
        this.body.setLinearVelocity(new this.ammo.btVector3(0, 0, 0))
      }, 500)
    })

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
  }

  addEventListeners () {
  }

  addObjects () {
    this.pos.set(0, -0.5, 0)
    this.quat.set(0, 0, 0, 1)
    const ground = this.createParalellepiped(40, 1, 40, 0, this.pos, this.quat, new THREE.MeshPhongMaterial({ color: 0xFFFFFF }))
    ground.castShadow = true
    ground.receiveShadow = true
  }

  loadAssets () {
    const rgbeLoader = new RGBELoader(this.loadingManager)

    const gltfLoader = new GLTFLoader(this.loadingManager)

    rgbeLoader.load(hdri, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      this.scene.environment = texture

      gltfLoader.load(textObject, (gltf) => {
        const sphereGeometry = new THREE.SphereGeometry(1.5, 50, 40)
        sphereGeometry.translate(5, 5, 0)
        this.ball = this.createSoftVolume(sphereGeometry, 15, 250)
      })
    })
  }

  addHelpers () {
    this.stats = Stats()
    document.body.appendChild(this.stats.dom)
  }

  addLights () {
    const ambientLight = new THREE.AmbientLight(0xbbbbbb)
    this.scene.add(ambientLight)

    const light = new THREE.DirectionalLight(0xffffff, 3)
    light.position.set(-10, 10, 5)
    light.castShadow = true
    const d = 20
    light.shadow.camera.left = -d
    light.shadow.camera.right = d
    light.shadow.camera.top = d
    light.shadow.camera.bottom = -d

    light.shadow.camera.near = 2
    light.shadow.camera.far = 50

    light.shadow.mapSize.x = 1024
    light.shadow.mapSize.y = 1024

    this.scene.add(light)
  }

  animate () {
    this.stats.update()
    this.renderer.render(this.scene, this.camera)

    const deltaTime = this.clock.getDelta()
    this.updatePhysics(deltaTime)

    window.requestAnimationFrame(this.animate.bind(this))
  }

  initPhysics () {
    const collisionConfiguration = new this.ammo.btSoftBodyRigidBodyCollisionConfiguration()
    const dispatcher = new this.ammo.btCollisionDispatcher(collisionConfiguration)
    const broadphase = new this.ammo.btDbvtBroadphase()
    const solver = new this.ammo.btSequentialImpulseConstraintSolver()
    const softBodySolver = new this.ammo.btDefaultSoftBodySolver()
    this.physicsWorld = new this.ammo.btSoftRigidDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration, softBodySolver)
    this.physicsWorld.setGravity(new this.ammo.btVector3(0, this.gravityConstant, 0))
    this.physicsWorld.getWorldInfo().set_m_gravity(new this.ammo.btVector3(0, this.gravityConstant, 0))

    this.transformAux1 = new this.ammo.btTransform()
    this.softBodyHelpers = new this.ammo.btSoftBodyHelpers()
  }

  updatePhysics (deltaTime) {
    // Step world
    this.physicsWorld.stepSimulation(deltaTime, 10)

    // Update soft volumes
    for (let i = 0, il = this.softBodies.length; i < il; i++) {
      const volume = this.softBodies[i]
      const geometry = volume.geometry
      const softBody = volume.userData.physicsBody
      const volumePositions = geometry.attributes.position.array
      const volumeNormals = geometry.attributes.normal.array
      const association = geometry.ammoIndexAssociation
      const numVerts = association.length
      const nodes = softBody.get_m_nodes()
      for (let j = 0; j < numVerts; j++) {
        const node = nodes.at(j)
        const nodePos = node.get_m_x()
        const x = nodePos.x()
        const y = nodePos.y()
        const z = nodePos.z()
        const nodeNormal = node.get_m_n()
        const nx = nodeNormal.x()
        const ny = nodeNormal.y()
        const nz = nodeNormal.z()

        const assocVertex = association[j]

        for (let k = 0, kl = assocVertex.length; k < kl; k++) {
          let indexVertex = assocVertex[k]
          volumePositions[indexVertex] = x
          volumeNormals[indexVertex] = nx
          indexVertex++
          volumePositions[indexVertex] = y
          volumeNormals[indexVertex] = ny
          indexVertex++
          volumePositions[indexVertex] = z
          volumeNormals[indexVertex] = nz
        }
      }

      geometry.attributes.position.needsUpdate = true
      geometry.attributes.normal.needsUpdate = true
    }

    // Update rigid bodies
    for (let i = 0, il = this.rigidBodies.length; i < il; i++) {
      const objThree = this.rigidBodies[i]
      const objPhys = objThree.userData.physicsBody
      const ms = objPhys.getMotionState()
      if (ms) {
        ms.getWorldTransform(this.transformAux1)
        const p = this.transformAux1.getOrigin()
        const q = this.transformAux1.getRotation()
        objThree.position.set(p.x(), p.y(), p.z())
        objThree.quaternion.set(q.x(), q.y(), q.z(), q.w())
      }
    }
  }

  isEqual (x1, y1, z1, x2, y2, z2) {
    const delta = 0.000001
    return Math.abs(x2 - x1) < delta &&
        Math.abs(y2 - y1) < delta &&
        Math.abs(z2 - z1) < delta
  }

  processGeometry (bufGeometry) {
    // Ony consider the position values when merging the vertices
    const posOnlyBufGeometry = new THREE.BufferGeometry()
    posOnlyBufGeometry.setAttribute('position', bufGeometry.getAttribute('position'))
    posOnlyBufGeometry.setIndex(bufGeometry.getIndex())

    // Merge the vertices so the triangle soup is converted to indexed triangles
    const indexedBufferGeom = BufferGeometryUtils.mergeVertices(posOnlyBufGeometry)

    // Create index arrays mapping the indexed vertices to bufGeometry vertices
    this.mapIndices(bufGeometry, indexedBufferGeom)
  }

  mapIndices (bufGeometry, indexedBufferGeom) {
    // Creates ammoVertices, ammoIndices and ammoIndexAssociation in bufGeometry

    const vertices = bufGeometry.attributes.position.array
    const idxVertices = indexedBufferGeom.attributes.position.array
    const indices = indexedBufferGeom.index.array

    const numIdxVertices = idxVertices.length / 3
    const numVertices = vertices.length / 3

    bufGeometry.ammoVertices = idxVertices
    bufGeometry.ammoIndices = indices
    bufGeometry.ammoIndexAssociation = []

    for (let i = 0; i < numIdxVertices; i++) {
      const association = []
      bufGeometry.ammoIndexAssociation.push(association)

      const i3 = i * 3

      for (let j = 0; j < numVertices; j++) {
        const j3 = j * 3
        if (this.isEqual(idxVertices[i3], idxVertices[i3 + 1], idxVertices[i3 + 2],
          vertices[j3], vertices[j3 + 1], vertices[j3 + 2])) {
          association.push(j3)
        }
      }
    }
  }

  createSoftVolume (bufferGeom, mass, pressure) {
    this.processGeometry(bufferGeom)

    const volume = new THREE.Mesh(bufferGeom, new THREE.MeshPhongMaterial({ color: 'red' }))
    volume.castShadow = true
    volume.receiveShadow = true
    volume.frustumCulled = false
    this.scene.add(volume)

    // this.textureLoader.load('textures/colors.png', function (texture) {
    //   volume.material.map = texture
    //   volume.material.needsUpdate = true
    // })

    // Volume physic object
    const volumeSoftBody = this.softBodyHelpers.CreateFromTriMesh(
      this.physicsWorld.getWorldInfo(),
      bufferGeom.ammoVertices,
      bufferGeom.ammoIndices,
      bufferGeom.ammoIndices.length / 3,
      true)

    const sbConfig = volumeSoftBody.get_m_cfg()
    sbConfig.set_viterations(40)
    sbConfig.set_piterations(40)

    // Soft-soft and soft-rigid collisions
    sbConfig.set_collisions(0x11)

    // Friction
    sbConfig.set_kDF(0.1)
    // Damping
    sbConfig.set_kDP(0.01)
    // Pressure
    sbConfig.set_kPR(pressure)
    // Stiffness
    volumeSoftBody.get_m_materials().at(0).set_m_kLST(0.9)
    volumeSoftBody.get_m_materials().at(0).set_m_kAST(0.9)

    volumeSoftBody.setTotalMass(mass, false)
    this.ammo.castObject(volumeSoftBody, this.ammo.btCollisionObject).getCollisionShape().setMargin(this.margin)
    this.physicsWorld.addSoftBody(volumeSoftBody, 1, -1)
    volume.userData.physicsBody = volumeSoftBody
    // Disable deactivation
    volumeSoftBody.setActivationState(4)

    this.softBodies.push(volume)

    return volumeSoftBody
  }

  createParalellepiped (sx, sy, sz, mass, pos, quat, material) {
    const threeObject = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material)
    const shape = new this.ammo.btBoxShape(new this.ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5))
    shape.setMargin(this.margin)

    this.createRigidBody(threeObject, shape, mass, pos, quat)

    return threeObject
  }

  createRigidBody (threeObject, physicsShape, mass, pos, quat) {
    threeObject.position.copy(pos)
    threeObject.quaternion.copy(quat)

    const transform = new this.ammo.btTransform()
    transform.setIdentity()
    transform.setOrigin(new this.ammo.btVector3(pos.x, pos.y, pos.z))
    transform.setRotation(new this.ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w))
    const motionState = new this.ammo.btDefaultMotionState(transform)

    const localInertia = new this.ammo.btVector3(0, 0, 0)
    physicsShape.calculateLocalInertia(mass, localInertia)

    const rbInfo = new this.ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia)
    const body = new this.ammo.btRigidBody(rbInfo)

    threeObject.userData.physicsBody = body

    this.scene.add(threeObject)

    if (mass > 0) {
      this.rigidBodies.push(threeObject)

      // Disable deactivation
      body.setActivationState(4)
    }

    this.physicsWorld.addRigidBody(body)

    console.log(body)

    this.body = body

    return body
  }
}

/**
* Create ThreeJsDraft
*/
// eslint-disable-next-line no-new
new ThreeJsDraft()
