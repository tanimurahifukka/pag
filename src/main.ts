import * as THREE from 'three'
import './style.css'

type AgentEvent =
  | { type: 'goto'; agentId: string; landmark: string }
  | { type: 'goto-xy'; agentId: string; x: number; z: number }
  | { type: 'attack'; agentId: string }
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
  static SLASH_FRAME_DURATION = 80
  static SLASH_FRAME_COUNT = 6
  static ARRIVAL_THRESHOLD = 0.05
  static MIN_SEPARATION = 0.8
  static FLOOR_HALF = 4
  static all: Agent[] = []
  static landmarks: { name: string; position: THREE.Vector3 }[] = []

  name: string
  sprite: THREE.Sprite
  bodyTex: THREE.Texture
  slashTex?: THREE.Texture
  swordBgTex?: THREE.Texture
  swordFgTex?: THREE.Texture
  swordBg?: THREE.Sprite
  swordFg?: THREE.Sprite
  labelSprite: THREE.Sprite
  labelTex: THREE.CanvasTexture
  labelCanvas: HTMLCanvasElement
  currentIntent = 'idle'
  state: 'idle' | 'walking' | 'attacking' = 'idle'
  prevState: 'idle' | 'walking' = 'idle'
  target: THREE.Vector3
  direction: 0 | 1 | 2 | 3 = 2
  walkFrame = 1
  walkFrameTime = 0
  slashFrame = 0
  slashFrameTime = 0
  idleEndTime = 0

  constructor(
    scene: THREE.Scene,
    spriteUrl: string,
    startPos: THREE.Vector3,
    name: string,
    options?: { tint?: THREE.Color; sword?: { bg: string; fg: string }; slashUrl?: string },
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
    if (options?.tint) mat.color.copy(options.tint)
    this.sprite = new THREE.Sprite(mat)
    this.sprite.scale.set(2, 2, 1)
    this.sprite.position.copy(startPos)
    this.sprite.renderOrder = 1
    scene.add(this.sprite)

    if (options?.sword) {
      const bgLoader = new THREE.TextureLoader()
      this.swordBgTex = bgLoader.load(options.sword.bg)
      this.swordBgTex.magFilter = THREE.NearestFilter
      this.swordBgTex.minFilter = THREE.NearestFilter
      this.swordBgTex.colorSpace = THREE.SRGBColorSpace
      this.swordBgTex.repeat.set(1 / 9, 1 / 4)
      this.swordBgTex.offset.set(0, 1 / 4)
      const swordBgMat = new THREE.SpriteMaterial({
        map: this.swordBgTex,
        transparent: true,
        depthTest: false,
      })
      this.swordBg = new THREE.Sprite(swordBgMat)
      this.swordBg.scale.set(1, 1, 1)
      this.swordBg.position.set(0, 0, 0)
      this.swordBg.renderOrder = 0
      this.sprite.add(this.swordBg)

      this.swordFgTex = bgLoader.load(options.sword.fg)
      this.swordFgTex.magFilter = THREE.NearestFilter
      this.swordFgTex.minFilter = THREE.NearestFilter
      this.swordFgTex.colorSpace = THREE.SRGBColorSpace
      this.swordFgTex.repeat.set(1 / 9, 1 / 4)
      this.swordFgTex.offset.set(0, 1 / 4)
      const swordFgMat = new THREE.SpriteMaterial({
        map: this.swordFgTex,
        transparent: true,
        depthTest: false,
      })
      this.swordFg = new THREE.Sprite(swordFgMat)
      this.swordFg.scale.set(1, 1, 1)
      this.swordFg.position.set(0, 0, 0)
      this.swordFg.renderOrder = 2
      this.sprite.add(this.swordFg)
    }

    this.labelCanvas = document.createElement('canvas')
    this.labelCanvas.width = 384
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
    this.labelSprite.scale.set(2.25, 0.375, 1)
    this.labelSprite.position.set(0, 1.2, 0)
    this.labelSprite.renderOrder = 10
    this.sprite.add(this.labelSprite)
    this.updateLabel('idle')

    if (options?.slashUrl) {
      const slashLoader = new THREE.TextureLoader()
      this.slashTex = slashLoader.load(options.slashUrl)
      this.slashTex.magFilter = THREE.NearestFilter
      this.slashTex.minFilter = THREE.NearestFilter
      this.slashTex.colorSpace = THREE.SRGBColorSpace
      this.slashTex.repeat.set(1 / 6, 1 / 4)
      this.slashTex.offset.set(0, 1 / 4)
    }

    Agent.all.push(this)
  }

  attack() {
    if (!this.slashTex) return
    this.prevState = this.state === 'attacking' ? this.prevState : (this.state as 'idle' | 'walking')
    this.state = 'attacking'
    this.slashFrame = 0
    this.slashFrameTime = 0
    ;(this.sprite.material as THREE.SpriteMaterial).map = this.slashTex
    ;(this.sprite.material as THREE.SpriteMaterial).needsUpdate = true
    if (this.swordBg) this.swordBg.visible = false
    if (this.swordFg) this.swordFg.visible = false
    this.updateLabel('⚔ attack')
  }

  private finishAttack() {
    ;(this.sprite.material as THREE.SpriteMaterial).map = this.bodyTex
    ;(this.sprite.material as THREE.SpriteMaterial).needsUpdate = true
    if (this.swordBg) this.swordBg.visible = true
    if (this.swordFg) this.swordFg.visible = true
    this.state = 'idle'
    this.idleEndTime = performance.now() + Agent.IDLE_MIN + Math.random() * (Agent.IDLE_MAX - Agent.IDLE_MIN)
    this.updateLabel('idle')
    this.setFrame(0, this.direction)
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
    const ox = frame / 9
    const oy = (3 - dir) / 4
    this.bodyTex.offset.x = ox
    this.bodyTex.offset.y = oy
    if (this.swordBgTex) {
      this.swordBgTex.offset.x = ox
      this.swordBgTex.offset.y = oy
    }
    if (this.swordFgTex) {
      this.swordFgTex.offset.x = ox
      this.swordFgTex.offset.y = oy
    }
  }

  private computeDirection(vx: number, vz: number): 0 | 1 | 2 | 3 {
    if (Math.abs(vx) > Math.abs(vz)) return vx > 0 ? 3 : 1
    return vz > 0 ? 2 : 0
  }

  update(now: number, dtMs: number) {
    const dt = dtMs / 1000

    if (this.state === 'attacking') {
      this.slashFrameTime += dtMs
      if (this.slashFrameTime >= Agent.SLASH_FRAME_DURATION) {
        this.slashFrame += 1
        this.slashFrameTime -= Agent.SLASH_FRAME_DURATION
        if (this.slashFrame >= Agent.SLASH_FRAME_COUNT) {
          this.finishAttack()
          return
        }
      }
      if (this.slashTex) {
        this.slashTex.offset.x = this.slashFrame / Agent.SLASH_FRAME_COUNT
        this.slashTex.offset.y = (3 - this.direction) / 4
      }
      return
    }

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

    for (const other of Agent.all) {
      if (other === this) continue
      const ox = this.sprite.position.x - other.sprite.position.x
      const oz = this.sprite.position.z - other.sprite.position.z
      const odist = Math.sqrt(ox * ox + oz * oz)
      if (odist > 0 && odist < Agent.MIN_SEPARATION) {
        const push = (Agent.MIN_SEPARATION - odist) / odist
        this.sprite.position.x += ox * push * 0.5
        this.sprite.position.z += oz * push * 0.5
      }
    }

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

function makeCobblestoneTexture(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#3d3530'
  ctx.fillRect(0, 0, size, size)

  const tileBase = 32
  const jitter = 6
  const seed = (x: number, y: number) => (Math.sin(x * 374.3 + y * 91.7) * 43758.5453) % 1
  const pseudoRandom = (x: number, y: number) => {
    const v = seed(x, y) - Math.floor(seed(x, y))
    return Math.abs(v)
  }

  for (let row = 0; row < size / tileBase + 1; row++) {
    const rowOffset = (row % 2) * (tileBase / 2)
    for (let col = -1; col < size / tileBase + 1; col++) {
      const px = col * tileBase + rowOffset
      const py = row * tileBase
      const w = tileBase - 2 - Math.floor(pseudoRandom(col, row) * jitter)
      const h = tileBase - 2 - Math.floor(pseudoRandom(col + 31, row + 17) * jitter)
      const gray = 90 + Math.floor(pseudoRandom(col + 7, row + 41) * 50)
      const r = gray + 15
      const g = gray + 8
      const b = gray
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
      ctx.fillRect(px + 1, py + 1, w, h)
      ctx.fillStyle = `rgba(255, 240, 220, ${0.05 + pseudoRandom(col + 100, row) * 0.05})`
      ctx.fillRect(px + 1, py + 1, w, 2)
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(3, 3)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  return tex
}

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
  new THREE.MeshStandardMaterial({ map: makeCobblestoneTexture() }),
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
agents.push(
  new Agent(scene, '/assets/sprites/body_male_walk.png', new THREE.Vector3(0, 1, 0), 'main', {
    sword: {
      bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
      fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
    },
    slashUrl: '/assets/sprites/body_male_slash.png',
  }),
)
agents.push(
  new Agent(scene, '/assets/sprites/body_female_walk.png', new THREE.Vector3(-1.5, 1, 1.5), 'sub-1', {
    sword: {
      bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
      fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
    },
    slashUrl: '/assets/sprites/body_female_slash.png',
  }),
)
agents.push(
  new Agent(scene, '/assets/sprites/body_muscular_walk.png', new THREE.Vector3(1.5, 1, -1.5), 'sub-2', {
    sword: {
      bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
      fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
    },
    slashUrl: '/assets/sprites/body_muscular_slash.png',
  }),
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
      {
        tint,
        sword: {
          bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
          fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
        },
        slashUrl: '/assets/sprites/body_male_slash.png',
      },
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
    a.slashTex?.dispose()
    ;(a.sprite.material as THREE.SpriteMaterial).dispose()
    agents.splice(idx, 1)
    const removeIdx = Agent.all.indexOf(a)
    if (removeIdx !== -1) Agent.all.splice(removeIdx, 1)
    return
  }

  const target = agents.find((a) => a.name === event.agentId)
  if (!target) return

  if (event.type === 'goto') {
    if (target.state === 'attacking') return
    const lm = Agent.landmarks.find((l) => l.name === event.landmark)
    if (!lm) return
    target.goto(lm.position)
  } else if (event.type === 'goto-xy') {
    if (target.state === 'attacking') return
    target.goto(new THREE.Vector3(event.x, 1, event.z))
  } else if (event.type === 'attack') {
    target.attack()
  } else if (event.type === 'idle') {
    if (target.state === 'attacking') return
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

let lastEventId = -1
async function pollHookEvents() {
  try {
    const res = await fetch(`/__pag/events?since=${lastEventId}`)
    if (!res.ok) return
    const events = (await res.json()) as { id: number; payload: any }[]
    for (const e of events) {
      lastEventId = Math.max(lastEventId, e.id)
      handleHookEvent(e.payload)
    }
  } catch {
    // dev server だけで動く想定なので失敗は静かに無視
  }
}

function handleHookEvent(payload: any) {
  if (!payload || typeof payload !== 'object') return
  const hookName: string = payload.hook_event_name || ''
  const toolName: string = payload.tool_name || (payload.tool_input && payload.tool_input.tool_name) || ''

  switch (hookName) {
    case 'PreToolUse': {
      if (toolName === 'Bash' || toolName === 'Write' || toolName === 'Edit') {
        window.pag.dispatch({ type: 'attack', agentId: 'main' })
      } else if (toolName === 'Read' || toolName === 'Grep' || toolName === 'Glob') {
        window.pag.dispatch({ type: 'goto', agentId: 'main', landmark: 'quest-board' })
      } else {
        window.pag.dispatch({ type: 'goto', agentId: 'main', landmark: 'fireplace' })
      }
      break
    }
    case 'PostToolUse':
    case 'Stop': {
      window.pag.dispatch({ type: 'idle', agentId: 'main', durationMs: 1500 })
      break
    }
    case 'SubagentStop': {
      const sessionId: string = payload.session_id || ''
      if (sessionId) {
        window.pag.dispatch({ type: 'remove', agentId: `sub-${sessionId.slice(0, 8)}` })
      }
      break
    }
  }
}

setInterval(pollHookEvents, 500)
void pollHookEvents()

animate()
