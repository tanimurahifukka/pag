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

type ParticleKind = 'ember' | 'dust' | 'heart'

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
    const color = kind === 'ember' ? 0xff8c3a : kind === 'dust' ? 0xc8b8a0 : 0xff7aa8
    const scale = kind === 'ember' ? 0.08 : kind === 'dust' ? 0.12 : 0.14
    const mat = new THREE.SpriteMaterial({
      color,
      transparent: true,
      depthTest: false,
    })
    this.sprite = new THREE.Sprite(mat)
    this.sprite.scale.set(scale, scale, 1)
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
    } else if (this.kind === 'dust') {
      this.maxLife = 350 + Math.random() * 200
      this.velocity.set(
        (Math.random() - 0.5) * 0.5,
        0.4 + Math.random() * 0.4,
        (Math.random() - 0.5) * 0.5,
      )
    } else if (this.kind === 'heart') {
      this.maxLife = 900 + Math.random() * 400
      this.velocity.set(
        (Math.random() - 0.5) * 0.6,
        0.7 + Math.random() * 0.3,
        (Math.random() - 0.5) * 0.6,
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
    } else if (this.kind === 'dust') {
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
    } else if (this.kind === 'heart') {
      const pulse = 1 + Math.sin(this.lifetime / 100) * 0.15
      const baseScale = 0.14
      this.sprite.scale.set(baseScale * pulse, baseScale * pulse, 1)
      mat.color.setRGB(1.0, 0.45 + Math.sin(this.lifetime / 200) * 0.1, 0.65)
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
  static landmarks: { name: string; position: THREE.Vector3; faceDir: 0 | 1 | 2 | 3 }[] = []
  static EMOTES = ['♪', '!', '?', '♥', '☆', 'z…', '⋯', '♬']

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
  nextLookAroundAt = 0
  nextEmoteAt = 0
  targetLandmark: string | null = null
  currentLandmark: string | null = null
  landmarkActionsLeft = 0
  nextLandmarkActionAt = 0
  errorFlashEnd = 0

  constructor(
    scene: THREE.Scene,
    spriteUrl: string,
    startPos: THREE.Vector3,
    name: string,
    options?: {
      tint?: THREE.Color
      sword?: { bg: string; fg: string }
      slashUrl?: string
    },
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
    this.nextLookAroundAt = 0
    this.nextEmoteAt = 0
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
    this.targetLandmark = lm ? lm.name : null
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

  flashError(durationMs = 600) {
    this.errorFlashEnd = performance.now() + durationMs
    this.updateLabel('✗ failed')
  }

  pickNewTarget() {
    const r = Math.random()
    const fireplaceMark = Agent.landmarks.find((l) => l.name === 'fireplace')
    const boardMark = Agent.landmarks.find((l) => l.name === 'quest-board')

    if (r < 0.5 && fireplaceMark) {
      this.target.copy(fireplaceMark.position)
      this.targetLandmark = 'fireplace'
      this.updateLabel('→ fireplace')
    } else if (r < 0.75 && boardMark) {
      this.target.copy(boardMark.position)
      this.targetLandmark = 'quest-board'
      this.updateLabel('→ quest-board')
    } else {
      this.target.x = (Math.random() * 2 - 1) * Agent.FLOOR_HALF
      this.target.z = (Math.random() * 2 - 1) * Agent.FLOOR_HALF
      this.targetLandmark = null
      this.updateLabel(`→ (${this.target.x.toFixed(1)}, ${this.target.z.toFixed(1)})`)
    }
    this.target.y = 1
    this.state = 'walking'
    this.walkFrame = 1
    this.walkFrameTime = 0
    this.nextLookAroundAt = 0
    this.nextEmoteAt = 0
    this.currentLandmark = null
    this.landmarkActionsLeft = 0
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

    const bodyMat = this.sprite.material as THREE.SpriteMaterial
    if (this.errorFlashEnd > 0 && now < this.errorFlashEnd) {
      bodyMat.color.setRGB(1.0, 0.4, 0.35)
    } else if (this.errorFlashEnd > 0) {
      bodyMat.color.setRGB(1, 1, 1)
      this.errorFlashEnd = 0
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
      if (this.landmarkActionsLeft > 0 && now >= this.nextLandmarkActionAt) {
        this.landmarkActionsLeft -= 1
        if (this.currentLandmark) {
          const lm = Agent.landmarks.find((l) => l.name === this.currentLandmark)
          if (lm) this.direction = lm.faceDir
        }
        this.setFrame(0, this.direction)
        this.attack()
        const interval =
          this.currentLandmark === 'dummy' ? 1000 + Math.random() * 500 : 1200 + Math.random() * 800
        this.nextLandmarkActionAt = now + interval
        return
      }
      if (now >= this.idleEndTime && this.landmarkActionsLeft === 0) this.pickNewTarget()
      if (this.state !== 'idle') {
        this.setFrame(0, this.direction)
        return
      }
      // idle 中、2〜4 秒ごとにランダムな方向に体を向ける（ただし next pickNewTarget まで残り時間が十分ある時のみ）
      if (this.nextLookAroundAt === 0) {
        this.nextLookAroundAt = now + 2000 + Math.random() * 2000
      }
      if (now >= this.nextLookAroundAt && this.idleEndTime - now > 600) {
        // 4 方向のうち現在と異なる方向をランダムに選ぶ
        const choices: (0 | 1 | 2 | 3)[] = [0, 1, 2, 3]
        const candidates = choices.filter((d) => d !== this.direction)
        this.direction = candidates[Math.floor(Math.random() * candidates.length)] as 0 | 1 | 2 | 3
        this.nextLookAroundAt = now + 2000 + Math.random() * 2000
      }
      if (this.nextEmoteAt === 0) {
        this.nextEmoteAt = now + 4000 + Math.random() * 6000
      }
      if (now >= this.nextEmoteAt && this.idleEndTime - now > 800 && now > this.bubbleHideAt) {
        if (Math.random() < 0.3) {
          const emote = Agent.EMOTES[Math.floor(Math.random() * Agent.EMOTES.length)]
          this.showTool(emote, 1500)
        }
        this.nextEmoteAt = now + 4000 + Math.random() * 6000
      }
      this.setFrame(0, this.direction)
      return
    }

    const dx = this.target.x - this.sprite.position.x
    const dz = this.target.z - this.sprite.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < Agent.ARRIVAL_THRESHOLD) {
      this.state = 'idle'
      this.idleEndTime = now + Agent.IDLE_MIN + Math.random() * (Agent.IDLE_MAX - Agent.IDLE_MIN)
      this.currentLandmark = this.targetLandmark
      if (this.currentLandmark) {
        const lm = Agent.landmarks.find((l) => l.name === this.currentLandmark)
        if (lm) this.direction = lm.faceDir
      }
      if (this.currentLandmark === 'workbench') {
        this.landmarkActionsLeft = 2 + Math.floor(Math.random() * 2)
        this.nextLandmarkActionAt = now + 400
      } else if (this.currentLandmark === 'dummy') {
        this.landmarkActionsLeft = 3 + Math.floor(Math.random() * 2)
        this.nextLandmarkActionAt = now + 300
      } else {
        this.landmarkActionsLeft = 0
      }
      this.updateLabel(this.currentLandmark ? `at ${this.currentLandmark}` : 'idle')
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

class Pet {
  static FRAME_DURATION = 250
  static FOLLOW_SPEED = 2.4
  static IDLE_RADIUS = 0.05

  sprite: THREE.Sprite
  tex: THREE.Texture
  owner: Agent
  offsetFromOwner: THREE.Vector3
  frame = 0
  frameTime = 0

  constructor(scene: THREE.Scene, spriteUrl: string, owner: Agent, offsetFromOwner: THREE.Vector3) {
    this.owner = owner
    this.offsetFromOwner = offsetFromOwner.clone()
    const loader = new THREE.TextureLoader()
    this.tex = loader.load(spriteUrl)
    this.tex.magFilter = THREE.NearestFilter
    this.tex.minFilter = THREE.NearestFilter
    this.tex.colorSpace = THREE.SRGBColorSpace
    this.tex.repeat.set(1 / 4, 1)
    this.tex.offset.set(0, 0)

    const mat = new THREE.SpriteMaterial({
      map: this.tex,
      transparent: true,
      depthTest: true,
    })
    this.sprite = new THREE.Sprite(mat)
    this.sprite.scale.set(0.7, 0.7, 1)
    const start = owner.sprite.position.clone().add(offsetFromOwner)
    start.y = 0.3
    this.sprite.position.copy(start)
    scene.add(this.sprite)
  }

  update(_now: number, dtMs: number) {
    this.frameTime += dtMs
    if (this.frameTime >= Pet.FRAME_DURATION) {
      this.frame = (this.frame + 1) % 4
      this.tex.offset.x = this.frame / 4
      this.frameTime -= Pet.FRAME_DURATION
    }

    const desiredX = this.owner.sprite.position.x + this.offsetFromOwner.x
    const desiredZ = this.owner.sprite.position.z + this.offsetFromOwner.z
    const dx = desiredX - this.sprite.position.x
    const dz = desiredZ - this.sprite.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist > Pet.IDLE_RADIUS) {
      const dt = dtMs / 1000
      const step = Math.min(Pet.FOLLOW_SPEED * dt, dist)
      this.sprite.position.x += (dx / dist) * step
      this.sprite.position.z += (dz / dist) * step
    }
    this.sprite.position.y = 0.3
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
    const color = kind === 'ember' ? 0xff8c3a : kind === 'dust' ? 0xc8b8a0 : 0xff7aa8
    const scale = kind === 'ember' ? 0.08 : kind === 'dust' ? 0.12 : 0.14
    mat.color.set(color)
    p.sprite.scale.setScalar(scale)
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

const workbench = new THREE.Group()
const workbenchTop = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 0.15, 0.6),
  new THREE.MeshStandardMaterial({ color: 0x8c5a2a }),
)
workbenchTop.position.y = 0.85
workbench.add(workbenchTop)

for (const x of [-0.5, 0.5]) {
  for (const z of [-0.25, 0.25]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.85, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x6b3a1a }),
    )
    leg.position.set(x, 0.425, z)
    workbench.add(leg)
  }
}

const workbenchAnvil = new THREE.Mesh(
  new THREE.BoxGeometry(0.3, 0.2, 0.2),
  new THREE.MeshStandardMaterial({ color: 0x404040, emissive: 0x303030, emissiveIntensity: 0.2 }),
)
workbenchAnvil.position.set(0, 1.05, 0)
workbench.add(workbenchAnvil)
workbench.position.set(0, 0, -3)
scene.add(workbench)

const library = new THREE.Group()
const libraryBody = new THREE.Mesh(
  new THREE.BoxGeometry(1.4, 1.6, 0.4),
  new THREE.MeshStandardMaterial({ color: 0x4a2a10 }),
)
libraryBody.position.y = 0.8
library.add(libraryBody)

for (const y of [0.55, 1.05]) {
  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.05, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x6b3a1a }),
  )
  shelf.position.y = y
  library.add(shelf)
}

const bookColors = [0x8a3a3a, 0x3a5a8a, 0x6a8a3a, 0xa86a3a, 0x6a3a6a, 0x3a8a8a]
const bookPositions = [
  [-0.45, 0.75],
  [-0.15, 0.75],
  [0.15, 0.75],
  [-0.15, 1.25],
  [0.15, 1.25],
  [0.45, 1.25],
]
bookColors.forEach((color, i) => {
  const book = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.35, 0.18),
    new THREE.MeshStandardMaterial({ color }),
  )
  const [x, y] = bookPositions[i]
  book.position.set(x, y, 0.13)
  library.add(book)
})

library.position.set(-3, 0, 3)
scene.add(library)

const trainingDummy = new THREE.Group()
const dummyPost = new THREE.Mesh(
  new THREE.BoxGeometry(0.15, 1.4, 0.15),
  new THREE.MeshStandardMaterial({ color: 0x4a2a10 }),
)
dummyPost.position.y = 0.7
trainingDummy.add(dummyPost)

const dummyBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.6, 0.7, 0.4),
  new THREE.MeshStandardMaterial({ color: 0xa88c4a }),
)
dummyBody.position.y = 1.4
trainingDummy.add(dummyBody)

const dummyHead = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.4, 0.4),
  new THREE.MeshStandardMaterial({ color: 0xa88c4a }),
)
dummyHead.position.y = 1.95
trainingDummy.add(dummyHead)

const dummyTargetBand = new THREE.Mesh(
  new THREE.BoxGeometry(0.62, 0.1, 0.42),
  new THREE.MeshStandardMaterial({ color: 0xc04040, emissive: 0x402020, emissiveIntensity: 0.2 }),
)
dummyTargetBand.position.y = 1.4
trainingDummy.add(dummyTargetBand)
trainingDummy.position.set(0, 0, 3)
scene.add(trainingDummy)

const door = new THREE.Group()
const doorFrame = new THREE.Mesh(
  new THREE.BoxGeometry(1.0, 1.9, 0.15),
  new THREE.MeshStandardMaterial({ color: 0x2a1a10 }),
)
doorFrame.position.y = 0.95
door.add(doorFrame)

const doorPanel = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 1.7, 0.05),
  new THREE.MeshStandardMaterial({ color: 0x5a3a1e }),
)
doorPanel.position.set(0, 0.95, 0.06)
door.add(doorPanel)

const doorHandle = new THREE.Mesh(
  new THREE.BoxGeometry(0.06, 0.06, 0.06),
  new THREE.MeshStandardMaterial({ color: 0xc0a050, emissive: 0x402a10, emissiveIntensity: 0.3 }),
)
doorHandle.position.set(0.25, 0.95, 0.12)
door.add(doorHandle)
door.position.set(3, 0, -3)
scene.add(door)

Agent.landmarks.push({ name: 'fireplace', position: new THREE.Vector3(-3, 1, -2), faceDir: 0 })
Agent.landmarks.push({ name: 'quest-board', position: new THREE.Vector3(3, 1, 2), faceDir: 2 })
Agent.landmarks.push({ name: 'workbench', position: new THREE.Vector3(0, 1, -2), faceDir: 0 })
Agent.landmarks.push({ name: 'library', position: new THREE.Vector3(-3, 1, 2), faceDir: 2 })
Agent.landmarks.push({ name: 'dummy', position: new THREE.Vector3(0, 1, 2), faceDir: 2 })
Agent.landmarks.push({ name: 'door', position: new THREE.Vector3(3, 1, -2), faceDir: 0 })

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

let totalEvents = 0
let lastEventTime = 0

const statusEl = (() => {
  const el = document.createElement('div')
  el.id = 'pag-status'
  el.innerHTML = '<span class="pag-dot"></span><span class="pag-events">0</span><span>events</span>'
  document.body.appendChild(el)
  return el
})()
const eventsCountEl = statusEl.querySelector('.pag-events') as HTMLSpanElement

function refreshStatus() {
  const isLive = lastEventTime > 0 && performance.now() - lastEventTime < 5000
  statusEl.classList.toggle('live', isLive)
  eventsCountEl.textContent = String(totalEvents)
}
setInterval(refreshStatus, 500)

agents.push(
  new Agent(scene, '/assets/sprites/legacy/char_main_walk.png', new THREE.Vector3(0, 1, 0), 'main', {
    sword: {
      bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
      fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
    },
    slashUrl: '/assets/sprites/legacy/char_main_slash.png',
  }),
)
agents.push(
  new Agent(scene, '/assets/sprites/legacy/char_sub-1_walk.png', new THREE.Vector3(-1.5, 1, 1.5), 'sub-1', {
    sword: {
      bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
      fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
    },
    slashUrl: '/assets/sprites/legacy/char_sub-1_slash.png',
  }),
)
agents.push(
  new Agent(scene, '/assets/sprites/legacy/char_sub-2_walk.png', new THREE.Vector3(1.5, 1, -1.5), 'sub-2', {
    sword: {
      bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
      fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
    },
    slashUrl: '/assets/sprites/legacy/char_sub-2_slash.png',
  }),
)
agents.push(
  new Agent(scene, '/assets/sprites/legacy/char_scout_walk.png', new THREE.Vector3(-2.5, 1, -1), 'scout', {
    sword: {
      bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
      fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
    },
    slashUrl: '/assets/sprites/legacy/char_scout_slash.png',
  }),
)
agents.push(
  new Agent(scene, '/assets/sprites/legacy/char_mage_walk.png', new THREE.Vector3(2.5, 1, 1), 'mage', {
    tint: new THREE.Color(0.95, 0.95, 1.05),
    sword: {
      bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
      fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
    },
    slashUrl: '/assets/sprites/legacy/char_mage_slash.png',
  }),
)
agents.push(
  new Agent(scene, '/assets/sprites/legacy/char_knight_walk.png', new THREE.Vector3(0, 1, 2.5), 'knight', {
    sword: {
      bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
      fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
    },
    slashUrl: '/assets/sprites/legacy/char_knight_slash.png',
  }),
)
agents.push(
  new Agent(scene, '/assets/sprites/legacy/char_archer_walk.png', new THREE.Vector3(2.5, 1, -1), 'archer', {
    sword: {
      bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
      fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
    },
    slashUrl: '/assets/sprites/legacy/char_archer_slash.png',
  }),
)
agents.push(
  new Agent(scene, '/assets/sprites/legacy/char_healer_walk.png', new THREE.Vector3(-1, 1, 2.5), 'healer', {
    sword: {
      bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
      fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
    },
    slashUrl: '/assets/sprites/legacy/char_healer_slash.png',
  }),
)
agents.push(
  new Agent(scene, '/assets/sprites/legacy/char_peasant_walk.png', new THREE.Vector3(1, 1, -2.5), 'peasant', {
    sword: {
      bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
      fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
    },
    slashUrl: '/assets/sprites/legacy/char_peasant_slash.png',
  }),
)
agents.push(
  new Agent(scene, '/assets/sprites/legacy/char_rogue_walk.png', new THREE.Vector3(-2.5, 1, 0.5), 'rogue', {
    sword: {
      bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
      fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
    },
    slashUrl: '/assets/sprites/legacy/char_rogue_slash.png',
  }),
)

const pets: Pet[] = []

function findAgent(n: string): Agent | undefined {
  return agents.find((a) => a.name === n)
}

const mainAgent = findAgent('main')
const mageAgent = findAgent('mage')
const knightAgent = findAgent('knight')
if (mainAgent) pets.push(new Pet(scene, '/assets/sprites/pets/slime.png', mainAgent, new THREE.Vector3(-0.6, 0, 0.5)))
if (mageAgent) pets.push(new Pet(scene, '/assets/sprites/pets/cat.png', mageAgent, new THREE.Vector3(0.6, 0, 0.5)))
if (knightAgent) pets.push(new Pet(scene, '/assets/sprites/pets/dog.png', knightAgent, new THREE.Vector3(-0.6, 0, 0.5)))

function dispatch(event: AgentEvent) {
  if (event.type === 'spawn') {
    if (agents.some((a) => a.name === event.agentId)) return
    const tint = event.tint ? new THREE.Color(event.tint[0], event.tint[1], event.tint[2]) : undefined
    const a = new Agent(
      scene,
      '/assets/sprites/legacy/char_main_walk.png',
      new THREE.Vector3(0, 1, 0),
      event.agentId,
      {
        tint,
        sword: {
          bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
          fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
        },
        slashUrl: '/assets/sprites/legacy/char_main_slash.png',
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

type ToD = 'morning' | 'day' | 'evening' | 'night'

function timeOfDay(): ToD {
  const h = new Date().getHours()
  if (h >= 5 && h < 10) return 'morning'
  if (h >= 10 && h < 17) return 'day'
  if (h >= 17 && h < 20) return 'evening'
  return 'night'
}

function applyTimeOfDay(tod: ToD) {
  switch (tod) {
    case 'morning':
      ambientLight.color.setHex(0xfff0e0)
      ambientLight.intensity = 0.7
      directionalLight.color.setHex(0xfff5d8)
      directionalLight.intensity = 1.6
      scene.background = new THREE.Color(0x2a2520)
      break
    case 'day':
      ambientLight.color.setHex(0xffffff)
      ambientLight.intensity = 0.8
      directionalLight.color.setHex(0xffffff)
      directionalLight.intensity = 1.8
      scene.background = new THREE.Color(0x303030)
      break
    case 'evening':
      ambientLight.color.setHex(0xffd0a0)
      ambientLight.intensity = 0.55
      directionalLight.color.setHex(0xffb070)
      directionalLight.intensity = 1.2
      scene.background = new THREE.Color(0x2a1a14)
      break
    case 'night':
      ambientLight.color.setHex(0x6080a0)
      ambientLight.intensity = 0.35
      directionalLight.color.setHex(0x8090a8)
      directionalLight.intensity = 0.5
      scene.background = new THREE.Color(0x0a0a14)
      break
  }
}

applyTimeOfDay(timeOfDay())
setInterval(() => applyTimeOfDay(timeOfDay()), 60_000)

let lastTime = 0
let emberSpawnTime = 0

function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  const dtMs = lastTime === 0 ? 0 : now - lastTime
  lastTime = now
  for (const a of agents) a.update(now, dtMs)
  for (const p of pets) p.update(now, dtMs)
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
  if (Math.random() < 0.04) {
    for (let i = 0; i < Agent.all.length; i++) {
      const a = Agent.all[i]
      if (a.state !== 'idle') continue
      for (let j = i + 1; j < Agent.all.length; j++) {
        const b = Agent.all[j]
        if (b.state !== 'idle') continue
        const dx = a.sprite.position.x - b.sprite.position.x
        const dz = a.sprite.position.z - b.sprite.position.z
        const dist2 = dx * dx + dz * dz
        if (dist2 < 1.4 * 1.4) {
          const mx = (a.sprite.position.x + b.sprite.position.x) / 2
          const my = 1.6 + Math.random() * 0.3
          const mz = (a.sprite.position.z + b.sprite.position.z) / 2
          emitParticle('heart', mx, my, mz)
        }
      }
    }
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

function attackWhenNearLandmark(agentId: string, landmark: string) {
  const startedAt = performance.now()
  const maxWaitMs = 6000
  const tick = () => {
    const agent = agents.find((a) => a.name === agentId)
    const mark = Agent.landmarks.find((l) => l.name === landmark)
    if (!agent || !mark) return
    const dist = Math.hypot(agent.sprite.position.x - mark.position.x, agent.sprite.position.z - mark.position.z)
    if (dist <= Agent.ARRIVAL_THRESHOLD + 0.1 || performance.now() - startedAt >= maxWaitMs) {
      window.pag.dispatch({ type: 'attack', agentId })
      return
    }
    window.setTimeout(tick, 80)
  }
  window.setTimeout(tick, 80)
}

function handleHookEvent(payload: any) {
  if (!payload || typeof payload !== 'object') return
  totalEvents += 1
  lastEventTime = performance.now()
  refreshStatus()
  const hookName: string = payload.hook_event_name || ''
  const toolName: string = payload.tool_name || (payload.tool_input && payload.tool_input.tool_name) || ''

  switch (hookName) {
    case 'SessionStart': {
      const m = agents.find((a) => a.name === 'main')
      if (m) {
        m.sprite.position.set(3, 1, -2)
        m.direction = 1
        window.pag.dispatch({ type: 'goto-xy', agentId: 'main', x: 0, z: 0 })
      }
      pushLog('main entered through door', 'spawn')
      return
    }
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

      if (toolName === 'Bash') {
        window.pag.dispatch({ type: 'goto', agentId: 'main', landmark: 'workbench' })
        pushLog(`main → workbench (Bash)`, 'attack')
      } else if (toolName === 'Write' || toolName === 'Edit') {
        window.pag.dispatch({ type: 'goto', agentId: 'main', landmark: 'dummy' })
        attackWhenNearLandmark('main', 'dummy')
        pushLog(`main ⚔ dummy (${toolName})`, 'attack')
      } else if (toolName === 'Read' || toolName === 'Grep' || toolName === 'Glob') {
        window.pag.dispatch({ type: 'goto', agentId: 'main', landmark: 'library' })
        pushLog(`main → library (${toolName})`, 'board')
      } else if (toolName === 'WebFetch' || toolName === 'WebSearch') {
        window.pag.dispatch({ type: 'goto', agentId: 'main', landmark: 'quest-board' })
        pushLog(`main → board (${toolName})`, 'board')
      } else {
        window.pag.dispatch({ type: 'goto', agentId: 'main', landmark: 'fireplace' })
        pushLog(`main → fireplace (${toolName})`, 'fire')
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
      const failed = !!(
        payload?.tool_response?.error ||
        payload?.tool_response?.is_error ||
        payload?.error ||
        payload?.success === false
      )
      if (failed) {
        const a = agents.find((x) => x.name === 'main')
        if (a) a.flashError()
        pushLog(`main ✗ ${toolName} failed`, 'remove')
        window.pag.dispatch({ type: 'idle', agentId: 'main', durationMs: 1500 })
        return
      }
      pushLog('main idle', 'idle')
      window.pag.dispatch({ type: 'idle', agentId: 'main', durationMs: 1500 })
      return
    }
    case 'Stop': {
      window.pag.dispatch({ type: 'goto', agentId: 'main', landmark: 'door' })
      pushLog('main → door (session end)', 'idle')
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
