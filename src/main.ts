import * as THREE from 'three'
import './style.css'

type AgentEvent =
  | { type: 'goto'; agentId: string; landmark: string }
  | { type: 'goto-xy'; agentId: string; x: number; z: number }
  | { type: 'idle'; agentId: string; durationMs?: number }
  | { type: 'spawn'; agentId: string; tint?: [number, number, number] }
  | { type: 'remove'; agentId: string }

interface PagApi {
  dispatch(event: AgentEvent): void
  list(): string[]
}

declare global {
  interface Window {
    pag: PagApi
  }
}

class Agent {
  static WALK_SPEED = 1.5
  static IDLE_MIN = 800
  static IDLE_MAX = 2200
  static WALK_FRAME_DURATION = 120
  static ARRIVAL_THRESHOLD = 0.05
  static FLOOR_HALF = 4
  static landmarks: { name: string; position: THREE.Vector3 }[] = []

  name: string
  sprite: THREE.Sprite
  bodyTex: THREE.Texture
  labelSprite: THREE.Sprite
  labelTex: THREE.CanvasTexture
  labelCanvas: HTMLCanvasElement
  currentIntent = 'idle'
  state: 'idle' | 'walking' = 'idle'
  target: THREE.Vector3
  direction: 0 | 1 | 2 | 3 = 2
  walkFrame = 1
  walkFrameTime = 0
  idleEndTime = 0

  constructor(
    scene: THREE.Scene,
    spriteUrl: string,
    startPos: THREE.Vector3,
    name: string,
    tint?: THREE.Color,
  ) {
    this.name = name
    this.target = new THREE.Vector3().copy(startPos)

    const loader = new THREE.TextureLoader()
    this.bodyTex = loader.load(spriteUrl)
    this.bodyTex.magFilter = THREE.NearestFilter
    this.bodyTex.minFilter = THREE.NearestFilter
    this.bodyTex.colorSpace = THREE.SRGBColorSpace
    this.bodyTex.repeat.set(1 / 9, 1 / 4)
    this.bodyTex.offset.set(0, 1 / 4)

    const mat = new THREE.SpriteMaterial({ map: this.bodyTex })
    if (tint) mat.color.copy(tint)
    this.sprite = new THREE.Sprite(mat)
    this.sprite.scale.set(2, 2, 1)
    this.sprite.position.copy(startPos)
    scene.add(this.sprite)

    this.labelCanvas = document.createElement('canvas')
    this.labelCanvas.width = 256
    this.labelCanvas.height = 64
    this.labelTex = new THREE.CanvasTexture(this.labelCanvas)
    this.labelTex.colorSpace = THREE.SRGBColorSpace
    this.labelTex.minFilter = THREE.LinearFilter
    this.labelTex.magFilter = THREE.LinearFilter
    const labelMat = new THREE.SpriteMaterial({
      map: this.labelTex,
      transparent: true,
      depthTest: false,
    })
    this.labelSprite = new THREE.Sprite(labelMat)
    this.labelSprite.scale.set(1.5, 0.375, 1)
    this.labelSprite.position.set(0, 1.2, 0)
    this.sprite.add(this.labelSprite)
    this.updateLabel('idle')
  }

  goto(target: THREE.Vector3) {
    this.target.copy(target)
    this.state = 'walking'
    this.walkFrame = 1
    this.walkFrameTime = 0
    const lm = Agent.landmarks.find((l) => l.position.distanceTo(target) < 0.01)
    this.updateLabel(lm ? `→ ${lm.name}` : `→ (${target.x.toFixed(1)}, ${target.z.toFixed(1)})`)
  }

  setIdle(durationMs: number) {
    this.state = 'idle'
    this.idleEndTime = performance.now() + durationMs
    this.updateLabel(`idle (${(durationMs / 1000).toFixed(1)}s)`)
  }

  private updateLabel(intent: string) {
    this.currentIntent = intent
    const ctx = this.labelCanvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, this.labelCanvas.width, this.labelCanvas.height)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(0, 0, this.labelCanvas.width, this.labelCanvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.font = '32px monospace'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${this.name}: ${intent}`, 8, this.labelCanvas.height / 2)
    this.labelTex.needsUpdate = true
  }

  pickNewTarget() {
    const r = Math.random()
    const fireplaceMark = Agent.landmarks.find((l) => l.name === 'fireplace')
    const boardMark = Agent.landmarks.find((l) => l.name === 'quest-board')

    if (r < 0.5 && fireplaceMark) {
      this.target.copy(fireplaceMark.position)
      this.updateLabel('→ fireplace')
    } else if (r < 0.75 && boardMark) {
      this.target.copy(boardMark.position)
      this.updateLabel('→ quest-board')
    } else {
      this.target.x = (Math.random() * 2 - 1) * Agent.FLOOR_HALF
      this.target.z = (Math.random() * 2 - 1) * Agent.FLOOR_HALF
      this.updateLabel(`→ (${this.target.x.toFixed(1)}, ${this.target.z.toFixed(1)})`)
    }
    this.target.y = 1
    this.state = 'walking'
    this.walkFrame = 1
    this.walkFrameTime = 0
  }

  private setFrame(frame: number, dir: 0 | 1 | 2 | 3) {
    this.bodyTex.offset.x = frame / 9
    this.bodyTex.offset.y = (3 - dir) / 4
  }

  private computeDirection(vx: number, vz: number): 0 | 1 | 2 | 3 {
    if (Math.abs(vx) > Math.abs(vz)) return vx > 0 ? 3 : 1
    return vz > 0 ? 2 : 0
  }

  update(now: number, dtMs: number) {
    const dt = dtMs / 1000

    if (this.state === 'idle') {
      if (now >= this.idleEndTime) this.pickNewTarget()
      this.setFrame(0, this.direction)
      return
    }

    const dx = this.target.x - this.sprite.position.x
    const dz = this.target.z - this.sprite.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < Agent.ARRIVAL_THRESHOLD) {
      this.state = 'idle'
      this.idleEndTime = now + Agent.IDLE_MIN + Math.random() * (Agent.IDLE_MAX - Agent.IDLE_MIN)
      this.updateLabel('idle')
      this.setFrame(0, this.direction)
      return
    }

    const step = Math.min(Agent.WALK_SPEED * dt, dist)
    const vx = dx / dist
    const vz = dz / dist
    this.sprite.position.x += vx * step
    this.sprite.position.z += vz * step
    this.direction = this.computeDirection(vx, vz)

    this.walkFrameTime += dtMs
    if (this.walkFrameTime >= Agent.WALK_FRAME_DURATION) {
      this.walkFrame = this.walkFrame >= 8 ? 1 : this.walkFrame + 1
      this.walkFrameTime -= Agent.WALK_FRAME_DURATION
    }
    this.setFrame(this.walkFrame, this.direction)
  }
}

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

const fireplace = new THREE.Group()
const fireplaceFrame = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 1.5, 0.6),
  new THREE.MeshStandardMaterial({ color: 0x3a3030 }),
)
fireplaceFrame.position.y = 0.75
fireplace.add(fireplaceFrame)

const fireplaceOpening = new THREE.Mesh(
  new THREE.BoxGeometry(0.7, 0.8, 0.1),
  new THREE.MeshStandardMaterial({
    color: 0xff4a1a,
    emissive: 0xff4a1a,
    emissiveIntensity: 1.5,
  }),
)
fireplaceOpening.position.set(0, 0.75, 0.35)
fireplace.add(fireplaceOpening)
fireplace.position.set(-3, 0, -3)
scene.add(fireplace)

const questBoard = new THREE.Group()
const questBoardPanel = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 1.2, 0.1),
  new THREE.MeshStandardMaterial({ color: 0x6b3a1a }),
)
questBoardPanel.position.y = 1.4
questBoard.add(questBoardPanel)

const questBoardPost = new THREE.Mesh(
  new THREE.BoxGeometry(0.15, 1.4, 0.15),
  new THREE.MeshStandardMaterial({ color: 0x4a2a10 }),
)
questBoardPost.position.y = 0.7
questBoard.add(questBoardPost)
questBoard.position.set(3, 0, 3)
scene.add(questBoard)

Agent.landmarks.push({ name: 'fireplace', position: new THREE.Vector3(-3, 1, -2) })
Agent.landmarks.push({ name: 'quest-board', position: new THREE.Vector3(3, 1, 2) })

const agents: Agent[] = []
agents.push(new Agent(scene, '/assets/sprites/body_male_walk.png', new THREE.Vector3(0, 1, 0), 'main'))
agents.push(
  new Agent(
    scene,
    '/assets/sprites/body_male_walk.png',
    new THREE.Vector3(-1.5, 1, 1.5),
    'sub-1',
    new THREE.Color(0.85, 0.85, 1.0),
  ),
)
agents.push(
  new Agent(
    scene,
    '/assets/sprites/body_male_walk.png',
    new THREE.Vector3(1.5, 1, -1.5),
    'sub-2',
    new THREE.Color(1.0, 0.85, 0.85),
  ),
)

function dispatch(event: AgentEvent) {
  if (event.type === 'spawn') {
    if (agents.some((a) => a.name === event.agentId)) return
    const tint = event.tint ? new THREE.Color(event.tint[0], event.tint[1], event.tint[2]) : undefined
    const a = new Agent(
      scene,
      '/assets/sprites/body_male_walk.png',
      new THREE.Vector3(0, 1, 0),
      event.agentId,
      tint,
    )
    agents.push(a)
    return
  }

  if (event.type === 'remove') {
    const idx = agents.findIndex((a) => a.name === event.agentId)
    if (idx === -1) return
    const a = agents[idx]
    scene.remove(a.sprite)
    a.bodyTex.dispose()
    ;(a.sprite.material as THREE.SpriteMaterial).dispose()
    agents.splice(idx, 1)
    return
  }

  const target = agents.find((a) => a.name === event.agentId)
  if (!target) return

  if (event.type === 'goto') {
    const lm = Agent.landmarks.find((l) => l.name === event.landmark)
    if (!lm) return
    target.goto(lm.position)
  } else if (event.type === 'goto-xy') {
    target.goto(new THREE.Vector3(event.x, 1, event.z))
  } else if (event.type === 'idle') {
    target.setIdle(event.durationMs ?? 1000)
  }
}

window.pag = {
  dispatch,
  list: () => agents.map((a) => a.name),
}

const fireLight = new THREE.PointLight(0xff8c3a, 8, 15)
fireLight.position.set(-3, 2, -3)
scene.add(fireLight)

const directionalLight = new THREE.DirectionalLight(0xfff0d8, 1.5)
directionalLight.position.set(5, 10, 5)
scene.add(directionalLight)

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
scene.add(ambientLight)

let lastTime = 0

function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  const dtMs = lastTime === 0 ? 0 : now - lastTime
  lastTime = now
  for (const a of agents) a.update(now, dtMs)
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
