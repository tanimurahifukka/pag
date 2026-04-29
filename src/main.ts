import * as THREE from 'three'
import './style.css'

type AgentEvent =
  | { type: 'goto'; agentId: string; landmark: string }
  | { type: 'goto-xy'; agentId: string; x: number; z: number }
  | { type: 'attack'; agentId: string }
  | { type: 'show-tool'; agentId: string; toolName: string; durationMs?: number }
  | { type: 'idle'; agentId: string; durationMs?: number }
  | { type: 'spawn'; agentId: string; tint?: [number, number, number] }
  | { type: 'remove'; agentId: string }

interface PagApi {
  dispatch(event: AgentEvent): void
  list(): string[]
}

type ParticleKind = 'ember' | 'dust'

declare global {
  interface Window {
    pag: PagApi
  }
}

class Particle {
  sprite: THREE.Sprite
  velocity: THREE.Vector3
  lifetime = 0
  maxLife = 1500
  kind: ParticleKind

  constructor(scene: THREE.Scene, kind: ParticleKind) {
    this.kind = kind
    const mat = new THREE.SpriteMaterial({
      color: kind === 'ember' ? 0xff8c3a : 0xc8b8a0,
      transparent: true,
      depthTest: false,
    })
    this.sprite = new THREE.Sprite(mat)
    this.sprite.scale.set(kind === 'ember' ? 0.08 : 0.12, kind === 'ember' ? 0.08 : 0.12, 1)
    this.sprite.renderOrder = 5
    this.velocity = new THREE.Vector3()
    scene.add(this.sprite)
  }

  spawn(x: number, y: number, z: number) {
    this.sprite.position.set(x, y, z)
    this.lifetime = 0
    if (this.kind === 'ember') {
      this.maxLife = 1400 + Math.random() * 800
      this.velocity.set(
        (Math.random() - 0.5) * 0.4,
        1.2 + Math.random() * 0.8,
        (Math.random() - 0.5) * 0.4,
      )
    } else {
      this.maxLife = 350 + Math.random() * 200
      this.velocity.set(
        (Math.random() - 0.5) * 0.5,
        0.4 + Math.random() * 0.4,
        (Math.random() - 0.5) * 0.5,
      )
    }
    this.sprite.visible = true
    const mat = this.sprite.material as THREE.SpriteMaterial
    mat.opacity = 1
  }

  update(dtMs: number): boolean {
    this.lifetime += dtMs
    if (this.lifetime >= this.maxLife) {
      this.sprite.visible = false
      return false
    }

    const dt = dtMs / 1000
    this.sprite.position.x += this.velocity.x * dt
    this.sprite.position.y += this.velocity.y * dt
    this.sprite.position.z += this.velocity.z * dt

    if (this.kind === 'ember') {
      this.velocity.y -= 0.5 * dt
    } else {
      this.velocity.multiplyScalar(0.9)
    }

    const t = this.lifetime / this.maxLife
    const mat = this.sprite.material as THREE.SpriteMaterial
    mat.opacity = 1 - t

    if (this.kind === 'ember') {
      const r = 1.0
      const g = 0.55 + (1 - t) * 0.3
      const b = 0.2 + (1 - t) * 0.2
      mat.color.setRGB(r, g, b)
    }

    return true
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
  bubbleSprite: THREE.Sprite
  bubbleTex: THREE.CanvasTexture
  bubbleCanvas: HTMLCanvasElement
  bubbleHideAt = 0
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

    this.bubbleCanvas = document.createElement('canvas')
    this.bubbleCanvas.width = 256
    this.bubbleCanvas.height = 80
    this.bubbleTex = new THREE.CanvasTexture(this.bubbleCanvas)
    this.bubbleTex.colorSpace = THREE.SRGBColorSpace
    this.bubbleTex.minFilter = THREE.LinearFilter
    this.bubbleTex.magFilter = THREE.LinearFilter
    const bubbleMat = new THREE.SpriteMaterial({
      map: this.bubbleTex,
      transparent: true,
      depthTest: false,
    })
    this.bubbleSprite = new THREE.Sprite(bubbleMat)
    this.bubbleSprite.scale.set(2.0, 0.625, 1)
    this.bubbleSprite.position.set(0, 1.7, 0)
    this.bubbleSprite.renderOrder = 11
    this.bubbleSprite.visible = false
    this.sprite.add(this.bubbleSprite)

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

  private drawBubble(text: string) {
    const ctx = this.bubbleCanvas.getContext('2d')
    if (!ctx) return
    const w = this.bubbleCanvas.width
    const h = this.bubbleCanvas.height
    ctx.clearRect(0, 0, w, h)
    const radius = 16
    ctx.fillStyle = '#fff8e8'
    ctx.beginPath()
    ctx.moveTo(radius, 4)
    ctx.lineTo(w - radius, 4)
    ctx.quadraticCurveTo(w - 4, 4, w - 4, radius)
    ctx.lineTo(w - 4, h - 24)
    ctx.quadraticCurveTo(w - 4, h - 12, w - radius, h - 12)
    ctx.lineTo(w / 2 + 12, h - 12)
    ctx.lineTo(w / 2, h - 4)
    ctx.lineTo(w / 2 - 12, h - 12)
    ctx.lineTo(radius, h - 12)
    ctx.quadraticCurveTo(4, h - 12, 4, h - 24)
    ctx.lineTo(4, radius)
    ctx.quadraticCurveTo(4, 4, radius, 4)
    ctx.fill()
    ctx.strokeStyle = '#3a2e20'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#3a2e20'
    ctx.font = 'bold 28px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, w / 2, (h - 16) / 2 + 4)
    this.bubbleTex.needsUpdate = true
  }

  showTool(toolName: string, durationMs = 1800) {
    this.drawBubble(toolName)
    this.bubbleSprite.visible = true
    this.bubbleHideAt = performance.now() + durationMs
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

    if (this.bubbleHideAt > 0 && now >= this.bubbleHideAt) {
      this.bubbleSprite.visible = false
      this.bubbleHideAt = 0
    }

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
      if (this.walkFrame === 1 || this.walkFrame === 5) {
        emitParticle(
          'dust',
          this.sprite.position.x + (Math.random() - 0.5) * 0.2,
          0.05,
          this.sprite.position.z + (Math.random() - 0.5) * 0.2,
        )
      }
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

const activeParticles: Particle[] = []
const particlePool: Particle[] = []

function emitParticle(kind: ParticleKind, x: number, y: number, z: number) {
  let p = particlePool.pop()
  if (!p) p = new Particle(scene, kind)
  if (p.kind !== kind) {
    const mat = p.sprite.material as THREE.SpriteMaterial
    mat.color.set(kind === 'ember' ? 0xff8c3a : 0xc8b8a0)
    p.sprite.scale.setScalar(kind === 'ember' ? 0.08 : 0.12)
    p.kind = kind
  }
  p.spawn(x, y, z)
  activeParticles.push(p)
}

function updateParticles(dtMs: number) {
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    if (!activeParticles[i].update(dtMs)) {
      const dead = activeParticles[i]
      activeParticles.splice(i, 1)
      particlePool.push(dead)
    }
  }
}

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
const taskAgents = new Map<string, string>()
let taskCounter = 0
const LOG_MAX = 10
const logEl = (() => {
  const el = document.createElement('div')
  el.id = 'pag-log'
  document.body.appendChild(el)
  return el
})()

function pushLog(message: string, tag?: string) {
  const now = new Date()
  const t =
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0')
  const row = document.createElement('div')
  row.className = 'pag-log-row'
  const ts = document.createElement('span')
  ts.className = 'pag-log-time'
  ts.textContent = t
  const msg = document.createElement('span')
  msg.className = 'pag-log-msg' + (tag ? ' pag-log-tag-' + tag : '')
  msg.textContent = message
  row.appendChild(ts)
  row.appendChild(msg)
  logEl.insertBefore(row, logEl.firstChild)
  // 古い行を fade させ、超過分は削除
  const rows = logEl.querySelectorAll('.pag-log-row')
  rows.forEach((r, i) => {
    if (i >= 4) r.classList.add('fade')
  })
  while (logEl.childElementCount > LOG_MAX) {
    logEl.removeChild(logEl.lastChild!)
  }
}
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
  } else if (event.type === 'show-tool') {
    target.showTool(event.toolName, event.durationMs)
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
let emberSpawnTime = 0

function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  const dtMs = lastTime === 0 ? 0 : now - lastTime
  lastTime = now
  for (const a of agents) a.update(now, dtMs)
  emberSpawnTime += dtMs
  while (emberSpawnTime >= 50) {
    emberSpawnTime -= 50
    emitParticle(
      'ember',
      -3 + (Math.random() - 0.5) * 0.5,
      0.7 + Math.random() * 0.3,
      -3 + 0.4 + Math.random() * 0.1,
    )
  }
  updateParticles(dtMs)
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
      if (toolName === 'Task') {
        const useId: string = payload.tool_use_id || `auto-${taskCounter++}`
        let agentName = taskAgents.get(useId)
        if (!agentName) {
          agentName = `task-${useId.slice(-6)}`
          taskAgents.set(useId, agentName)
          window.pag.dispatch({
            type: 'spawn',
            agentId: agentName,
            tint: [0.85, 1.0, 0.85],
          })
        }
        pushLog(`subagent ${agentName} <- Task`, 'spawn')
        window.pag.dispatch({ type: 'show-tool', agentId: agentName, toolName: 'Task' })
        window.pag.dispatch({ type: 'goto', agentId: agentName, landmark: 'fireplace' })
        return
      }

      window.pag.dispatch({ type: 'show-tool', agentId: 'main', toolName })

      if (toolName === 'Bash' || toolName === 'Write' || toolName === 'Edit') {
        pushLog(`main ⚔ ${toolName}`, 'attack')
        window.pag.dispatch({ type: 'attack', agentId: 'main' })
      } else if (toolName === 'Read' || toolName === 'Grep' || toolName === 'Glob') {
        pushLog(`main → board (${toolName})`, 'board')
        window.pag.dispatch({ type: 'goto', agentId: 'main', landmark: 'quest-board' })
      } else {
        pushLog(`main → fireplace (${toolName})`, 'fire')
        window.pag.dispatch({ type: 'goto', agentId: 'main', landmark: 'fireplace' })
      }
      return
    }
    case 'PostToolUse': {
      if (toolName === 'Task') {
        const useId: string = payload.tool_use_id || ''
        const agentName = taskAgents.get(useId)
        if (agentName) {
          pushLog(`subagent ${agentName} done`, 'remove')
          window.pag.dispatch({ type: 'remove', agentId: agentName })
          taskAgents.delete(useId)
        }
        return
      }
      pushLog('main idle', 'idle')
      window.pag.dispatch({ type: 'idle', agentId: 'main', durationMs: 1500 })
      return
    }
    case 'Stop': {
      pushLog('main idle', 'idle')
      window.pag.dispatch({ type: 'idle', agentId: 'main', durationMs: 1500 })
      return
    }
    case 'SubagentStop': {
      pushLog(`subagent stopped`, 'remove')
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

pushLog('pag ready', 'idle')
animate()
