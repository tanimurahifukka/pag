import * as THREE from 'three'
import './style.css'

const frustumSize = 10
const aspect = innerWidth / innerHeight

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a1a)

const camera = new THREE.OrthographicCamera(
  (frustumSize * aspect) / -2,
  (frustumSize * aspect) / 2,
  frustumSize / 2,
  frustumSize / -2,
  0.1,
  100,
)
camera.position.set(5, 5, 5)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: false })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(devicePixelRatio)
document.body.appendChild(renderer.domElement)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({ color: 0x6b4a2a }),
)
floor.rotation.x = -Math.PI / 2
scene.add(floor)

const loader = new THREE.TextureLoader()
const bodyTex = loader.load('/assets/sprites/body_male_walk.png')
bodyTex.magFilter = THREE.NearestFilter
bodyTex.minFilter = THREE.NearestFilter
bodyTex.colorSpace = THREE.SRGBColorSpace
bodyTex.repeat.set(1 / 9, 1 / 4)
bodyTex.offset.set(0, 1 / 4)

const bodyMat = new THREE.SpriteMaterial({ map: bodyTex })
const character = new THREE.Sprite(bodyMat)
character.scale.set(1, 1, 1)
character.position.set(0, 0.5, 0)
scene.add(character)

const fireLight = new THREE.PointLight(0xff8c3a, 8, 15)
fireLight.position.set(-3, 2, -3)
scene.add(fireLight)

const directionalLight = new THREE.DirectionalLight(0xfff0d8, 1.5)
directionalLight.position.set(5, 10, 5)
scene.add(directionalLight)

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
scene.add(ambientLight)

type AgentState = 'idle' | 'walking'

const WALK_SPEED = 1.5
const IDLE_MIN = 800
const IDLE_MAX = 2200
const WALK_FRAME_DURATION = 120
const ARRIVAL_THRESHOLD = 0.05
const FLOOR_HALF = 4

let agentState: AgentState = 'idle'
let target = new THREE.Vector3(0, 0.5, 0)
let idleEndTime = 0
let lastTime = 0
let walkFrameTime = 0
let walkFrame = 1
let direction: 0 | 1 | 2 | 3 = 2

function pickNewTarget() {
  target.x = (Math.random() * 2 - 1) * FLOOR_HALF
  target.z = (Math.random() * 2 - 1) * FLOOR_HALF
  target.y = 0.5
  agentState = 'walking'
  walkFrame = 1
  walkFrameTime = 0
}

function computeDirection(vx: number, vz: number): 0 | 1 | 2 | 3 {
  if (Math.abs(vx) > Math.abs(vz)) return vx > 0 ? 3 : 1
  return vz > 0 ? 2 : 0
}

function setSpriteFrame(frame: number, dir: 0 | 1 | 2 | 3) {
  bodyTex.offset.x = frame / 9
  bodyTex.offset.y = (3 - dir) / 4
}

function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  const dtMs = lastTime === 0 ? 0 : now - lastTime
  const dt = dtMs / 1000
  lastTime = now

  if (agentState === 'idle') {
    if (now >= idleEndTime) pickNewTarget()
    setSpriteFrame(0, direction)
  } else {
    const dx = target.x - character.position.x
    const dz = target.z - character.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < ARRIVAL_THRESHOLD) {
      agentState = 'idle'
      idleEndTime = now + IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN)
      setSpriteFrame(0, direction)
    } else {
      const step = Math.min(WALK_SPEED * dt, dist)
      const vx = dx / dist
      const vz = dz / dist
      character.position.x += vx * step
      character.position.z += vz * step
      direction = computeDirection(vx, vz)

      walkFrameTime += dtMs
      if (walkFrameTime >= WALK_FRAME_DURATION) {
        walkFrame = walkFrame >= 8 ? 1 : walkFrame + 1
        walkFrameTime -= WALK_FRAME_DURATION
      }
      setSpriteFrame(walkFrame, direction)
    }
  }
  fireLight.intensity = 8 + Math.random() * 2
  renderer.render(scene, camera)
}

function handleResize() {
  const aspect = innerWidth / innerHeight

  camera.left = (frustumSize * aspect) / -2
  camera.right = (frustumSize * aspect) / 2
  camera.top = frustumSize / 2
  camera.bottom = frustumSize / -2
  camera.updateProjectionMatrix()

  renderer.setSize(innerWidth, innerHeight)
}

addEventListener('resize', handleResize)

animate()
