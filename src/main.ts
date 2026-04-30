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

type ParticleKind =
  | 'ember'
  | 'dust'
  | 'heart'
  | 'smoke'
  | 'spell'
  | 'arrow'
  | 'rain'
  | 'butterfly'
  | 'firefly'
  | 'star'

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
    const color =
      kind === 'ember' ? 0xff8c3a :
      kind === 'dust' ? 0xc8b8a0 :
      kind === 'heart' ? 0xff7aa8 :
      kind === 'smoke' ? 0xa8a8a8 :
      kind === 'spell' ? 0xa060ff :
      kind === 'rain' ? 0x88a8d0 :
      kind === 'butterfly' ? 0xffd0e0 :
      kind === 'firefly' ? 0xfff080 :
      kind === 'star' ? 0xffffff :
      0xffd870
    const scale =
      kind === 'ember' ? 0.08 :
      kind === 'dust' ? 0.12 :
      kind === 'heart' ? 0.14 :
      kind === 'smoke' ? 0.18 :
      kind === 'rain' ? 0.04 :
      kind === 'butterfly' ? 0.10 :
      kind === 'firefly' ? 0.06 :
      kind === 'star' ? 0.08 :
      0.10
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
    } else if (this.kind === 'smoke') {
      this.maxLife = 2200 + Math.random() * 1000
      this.velocity.set(
        (Math.random() - 0.5) * 0.15,
        0.6 + Math.random() * 0.3,
        (Math.random() - 0.5) * 0.15,
      )
    } else if (this.kind === 'spell') {
      this.maxLife = 700 + Math.random() * 400
      const angle = Math.random() * Math.PI * 2
      this.velocity.set(
        Math.cos(angle) * 0.5,
        0.8 + Math.random() * 0.4,
        Math.sin(angle) * 0.5,
      )
    } else if (this.kind === 'arrow') {
      this.maxLife = 400 + Math.random() * 200
      const dirX = Math.random() < 0.5 ? -1 : 1
      this.velocity.set(
        dirX * (1.5 + Math.random()),
        (Math.random() - 0.3) * 0.5,
        (Math.random() - 0.5) * 0.6,
      )
    } else if (this.kind === 'rain') {
      this.maxLife = 1500
      this.velocity.set(
        -1.5 + (Math.random() - 0.5) * 0.4,
        -8 - Math.random() * 2,
        -0.5 + (Math.random() - 0.5) * 0.4,
      )
    } else if (this.kind === 'butterfly') {
      this.maxLife = 4000 + Math.random() * 2000
      this.velocity.set(
        (Math.random() - 0.5) * 1.0,
        (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 1.0,
      )
    } else if (this.kind === 'firefly') {
      this.maxLife = 3000 + Math.random() * 2000
      this.velocity.set(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.3) * 0.4,
        (Math.random() - 0.5) * 0.4,
      )
    } else if (this.kind === 'star') {
      this.maxLife = 1200 + Math.random() * 600
      this.velocity.set(4 + Math.random() * 2, 0, 0)
    }
    this.sprite.visible = true
    const mat = this.sprite.material as THREE.SpriteMaterial
    mat.opacity = this.kind === 'smoke' ? 0.4 : 1
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
    } else if (this.kind === 'smoke') {
      this.velocity.multiplyScalar(0.99)
    } else if (this.kind === 'rain' && this.sprite.position.y < 0.05) {
      this.lifetime = this.maxLife
      this.sprite.visible = false
      return false
    }

    const t = this.lifetime / this.maxLife
    const mat = this.sprite.material as THREE.SpriteMaterial
    mat.opacity = this.kind === 'smoke' ? (1 - t) * 0.4 : 1 - t

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
    } else if (this.kind === 'spell') {
      const t = this.lifetime / this.maxLife
      mat.opacity = 1 - t
      mat.color.setRGB(0.6 + t * 0.4, 0.3 * (1 - t) + 0.5 * t, 1 - t * 0.4)
    } else if (this.kind === 'arrow') {
      const t = this.lifetime / this.maxLife
      mat.opacity = 1 - t
    } else if (this.kind === 'rain') {
      mat.opacity = 0.55
    } else if (this.kind === 'butterfly') {
      const t = this.lifetime / 1000
      this.velocity.x += Math.sin(t * 6) * 0.05
      this.velocity.y += Math.cos(t * 8) * 0.04
      const fade = this.lifetime / this.maxLife
      mat.opacity = 1 - fade
    } else if (this.kind === 'firefly') {
      const flicker = 0.5 + 0.5 * Math.sin(this.lifetime / 80)
      mat.opacity = flicker * (1 - this.lifetime / this.maxLife)
    } else if (this.kind === 'star') {
      mat.opacity = 1 - this.lifetime / this.maxLife
    }

    return true
  }
}

class FloatingNumber {
  sprite: THREE.Sprite
  tex: THREE.CanvasTexture
  canvas: HTMLCanvasElement
  velocity: THREE.Vector3
  lifetime = 0
  maxLife = 1100

  constructor(scene: THREE.Scene, x: number, y: number, z: number, text: string, color: string, big: boolean) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = big ? 192 : 128
    this.canvas.height = big ? 56 : 40
    this.tex = new THREE.CanvasTexture(this.canvas)
    this.tex.colorSpace = THREE.SRGBColorSpace
    this.tex.minFilter = THREE.LinearFilter
    this.tex.magFilter = THREE.LinearFilter
    const ctx = this.canvas.getContext('2d')!
    ctx.font = `bold ${big ? 36 : 28}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = big ? 4 : 3
    ctx.strokeStyle = '#000000'
    ctx.strokeText(text, this.canvas.width / 2, this.canvas.height / 2)
    ctx.fillStyle = color
    ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2)
    this.tex.needsUpdate = true
    const mat = new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthTest: false })
    this.sprite = new THREE.Sprite(mat)
    this.sprite.scale.set(big ? 1.0 : 0.7, big ? 0.3 : 0.22, 1)
    this.sprite.position.set(x, y, z)
    this.sprite.renderOrder = 12
    scene.add(this.sprite)
    this.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.4, 1.5, (Math.random() - 0.5) * 0.4)
  }

  update(dtMs: number): boolean {
    this.lifetime += dtMs
    if (this.lifetime >= this.maxLife) return false
    const dt = dtMs / 1000
    this.sprite.position.x += this.velocity.x * dt
    this.sprite.position.y += this.velocity.y * dt
    this.sprite.position.z += this.velocity.z * dt
    this.velocity.y -= 1.0 * dt
    const t = this.lifetime / this.maxLife
    ;(this.sprite.material as THREE.SpriteMaterial).opacity = 1 - t * t
    return true
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.sprite)
    this.tex.dispose()
    ;(this.sprite.material as THREE.SpriteMaterial).dispose()
  }
}

const floatingNumbers: FloatingNumber[] = []

function emitDamageNumber(x: number, y: number, z: number, value: number, critical: boolean, spellName?: string) {
  if (spellName) {
    floatingNumbers.push(new FloatingNumber(scene, x, y + 0.3, z, spellName, '#a060ff', true))
    floatingNumbers.push(new FloatingNumber(scene, x, y, z, String(value), '#ffd870', false))
  } else if (critical) {
    floatingNumbers.push(new FloatingNumber(scene, x, y + 0.3, z, 'CRITICAL!', '#ff5040', true))
    floatingNumbers.push(new FloatingNumber(scene, x, y, z, String(value), '#ffffff', false))
  } else {
    floatingNumbers.push(new FloatingNumber(scene, x, y, z, String(value), '#ffffff', false))
  }
}

class Agent {
  static WALK_SPEED = 1.5
  static IDLE_MIN = 800
  static IDLE_MAX = 2200
  static SLEEP_CHANCE = 0.012
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
  isSleeping = false
  sleepEndAt = 0

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
    if (this.isSleeping) this.wakeUpFromSleep()
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
    if (this.isSleeping) this.wakeUpFromSleep()
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

  private wakeUpFromSleep() {
    this.isSleeping = false
    this.sleepEndAt = 0
    this.sprite.scale.set(2, 2, 1)
    this.sprite.position.y = 1
    this.bubbleSprite.visible = false
    this.bubbleHideAt = 0
    this.updateLabel('idle')
    this.setFrame(0, this.direction)
  }

  flashError(durationMs = 600) {
    this.errorFlashEnd = performance.now() + durationMs
    this.updateLabel('✗ failed')
  }

  pickNewTarget() {
    if (this.isSleeping) return
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
        if (this.slashFrame === 3 && activeBoss && activeBoss.state === 'alive') {
          const dx = activeBoss.sprite.position.x - this.sprite.position.x
          const dz = activeBoss.sprite.position.z - this.sprite.position.z
          const dist2 = dx * dx + dz * dz
          if (dist2 < 1.7 * 1.7) {
            const critical = Math.random() < 0.15
            const isMage = this.name.includes('mage')
            const isArcher = this.name.includes('archer')
            const baseDamage = critical ? 2 : 1
            const damage = isMage ? baseDamage : baseDamage
            activeBoss.damage(damage)
            const bx = activeBoss.sprite.position.x
            const by = activeBoss.sprite.position.y + 1.0
            const bz = activeBoss.sprite.position.z
            let spellName: string | undefined
            if (isMage) {
              spawnMagicSigil(bx, bz)
              const SPELLS = ['FIRA', 'BLIZZARA', 'THUNDARA', 'HOLY', 'BIO']
              spellName = SPELLS[Math.floor(Math.random() * SPELLS.length)]
              for (let i = 0; i < 6; i++) emitParticle('spell', bx, by - 0.6, bz)
            } else if (isArcher) {
              for (let i = 0; i < 4; i++) emitParticle('arrow', bx, by - 0.5, bz)
            } else {
              emitParticle('ember', bx, by - 0.5, bz)
            }
            emitDamageNumber(bx, by, bz, damage, critical, spellName)
          }
        }
        if (this.slashFrame === 3 && activeSlime && activeSlime.state === 'alive') {
          const dx = activeSlime.position.x - this.sprite.position.x
          const dz = activeSlime.position.z - this.sprite.position.z
          const dist2 = dx * dx + dz * dz
          if (dist2 < 1.4 * 1.4) {
            const critical = Math.random() < 0.15
            const damage = critical ? 2 : 1
            activeSlime.damage(damage)
            const sx = activeSlime.position.x
            const sy = activeSlime.sprite.position.y + 0.5
            const sz = activeSlime.position.z
            emitDamageNumber(sx, sy, sz, damage, critical)
            if (this.name.includes('mage')) {
              spawnMagicSigil(sx, sz)
            }
            emitParticle('ember', sx, sy - 0.3, sz)
          }
        }
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
      if (
        !this.isSleeping &&
        timeOfDay() === 'night' &&
        currentWeather === 'clear' &&
        !this.currentLandmark &&
        !inDungeon.has(this.name) &&
        !this.name.startsWith('npc-') &&
        !this.name.startsWith('task-') &&
        Math.random() < Agent.SLEEP_CHANCE
      ) {
        this.isSleeping = true
        this.sleepEndAt = now + 8000 + Math.random() * 8000
        this.sprite.scale.set(2.6, 0.8, 1)
        this.sprite.position.y = 0.5
        this.setFrame(0, this.direction)
        this.updateLabel('z…z…')
        this.showTool('z…', this.sleepEndAt - now)
      }

      if (this.isSleeping) {
        if (now >= this.sleepEndAt || timeOfDay() !== 'night') {
          this.wakeUpFromSleep()
        } else {
          return
        }
      }

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
      if (activeChest && activeChest.state !== 'fading' && !inDungeon.has(this.name) && !this.name.startsWith('task-')) {
        const dx = activeChest.position.x - this.sprite.position.x
        const dz = activeChest.position.z - this.sprite.position.z
        const dist2 = dx * dx + dz * dz
        if (dist2 < 1.0 * 1.0 && activeChest.claim()) {
          emitGoldBurst(activeChest.position.x, 0.6, activeChest.position.z)
          pushLog(`${this.name} claims treasure (${activeChest.claims}/3)`, 'spawn')
          this.target.set((Math.random() - 0.5) * 6, 1, (Math.random() - 0.5) * 6)
          this.state = 'walking'
          this.walkFrameTime = 0
          this.walkFrame = 1
          this.targetLandmark = null
          this.currentLandmark = null
          this.updateLabel(`→ (${this.target.x.toFixed(1)}, ${this.target.z.toFixed(1)})`)
          return
        }
      }
      if (
        activeBoss &&
        activeBoss.state === 'alive' &&
        !inDungeon.has(this.name) &&
        !this.name.startsWith('task-') &&
        !this.name.startsWith('npc-')
      ) {
        const dx = activeBoss.sprite.position.x - this.sprite.position.x
        const dz = activeBoss.sprite.position.z - this.sprite.position.z
        const dist2 = dx * dx + dz * dz
        if (dist2 < 1.7 * 1.7) {
          this.direction = this.computeDirection(dx, dz)
          this.setFrame(0, this.direction)
          this.attack()
          return
        }
      }
      if (
        activeSlime &&
        activeSlime.state === 'alive' &&
        !inDungeon.has(this.name) &&
        !this.name.startsWith('task-') &&
        !this.name.startsWith('npc-')
      ) {
        const dx = activeSlime.position.x - this.sprite.position.x
        const dz = activeSlime.position.z - this.sprite.position.z
        const dist2 = dx * dx + dz * dz
        if (dist2 < 1.4 * 1.4) {
          this.direction = this.computeDirection(dx, dz)
          this.setFrame(0, this.direction)
          this.attack()
          return
        }
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
      if (this.name.startsWith('npc-')) {
        pushLog(`NPC ${this.name.split('-')[1]} left`, 'remove')
        npcAgents.delete(this.name)
        window.pag.dispatch({ type: 'remove', agentId: this.name })
        return
      }
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
        audio.playFootstep()
      }
    }
    this.setFrame(this.walkFrame, this.direction)
  }
}

class Boss {
  static MAX_HP = 8

  sprite: THREE.Sprite
  bodyTex: THREE.Texture
  slashTex: THREE.Texture
  hpBarSprite: THREE.Sprite
  hpBarTex: THREE.CanvasTexture
  hpBarCanvas: HTMLCanvasElement
  hp = Boss.MAX_HP
  walkFrame = 0
  walkFrameTime = 0
  direction: 0 | 1 | 2 | 3 = 2
  state: 'alive' | 'dying' = 'alive'
  spawnAt: number

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    const loader = new THREE.TextureLoader()
    this.bodyTex = loader.load('/assets/sprites/legacy/char_boss_skeleton_walk.png')
    this.bodyTex.magFilter = THREE.NearestFilter
    this.bodyTex.minFilter = THREE.NearestFilter
    this.bodyTex.colorSpace = THREE.SRGBColorSpace
    this.bodyTex.repeat.set(1 / 9, 1 / 4)
    this.bodyTex.offset.set(0, 1 / 4)

    this.slashTex = loader.load('/assets/sprites/legacy/char_boss_skeleton_slash.png')
    this.slashTex.magFilter = THREE.NearestFilter
    this.slashTex.minFilter = THREE.NearestFilter
    this.slashTex.colorSpace = THREE.SRGBColorSpace
    this.slashTex.repeat.set(1 / 6, 1 / 4)
    this.slashTex.offset.set(0, 1 / 4)

    const mat = new THREE.SpriteMaterial({ map: this.bodyTex, transparent: true })
    this.sprite = new THREE.Sprite(mat)
    this.sprite.scale.set(3, 3, 1)
    this.sprite.position.copy(position)
    scene.add(this.sprite)

    this.hpBarCanvas = document.createElement('canvas')
    this.hpBarCanvas.width = 192
    this.hpBarCanvas.height = 24
    this.hpBarTex = new THREE.CanvasTexture(this.hpBarCanvas)
    this.hpBarTex.colorSpace = THREE.SRGBColorSpace
    const hpMat = new THREE.SpriteMaterial({
      map: this.hpBarTex,
      transparent: true,
      depthTest: false,
    })
    this.hpBarSprite = new THREE.Sprite(hpMat)
    this.hpBarSprite.scale.set(0.5, 0.0625, 1)
    this.hpBarSprite.position.set(0, 0.85, 0)
    this.hpBarSprite.renderOrder = 12
    this.sprite.add(this.hpBarSprite)

    this.spawnAt = performance.now()
    this.drawHpBar()
  }

  private drawHpBar() {
    const ctx = this.hpBarCanvas.getContext('2d')
    if (!ctx) return
    const w = this.hpBarCanvas.width
    const h = this.hpBarCanvas.height
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    ctx.fillRect(0, 0, w, h)
    const ratio = Math.max(0, this.hp / Boss.MAX_HP)
    const hue = ratio > 0.5 ? 120 : ratio > 0.25 ? 50 : 0
    ctx.fillStyle = `hsl(${hue}, 80%, 50%)`
    ctx.fillRect(2, 2, (w - 4) * ratio, h - 4)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`BOSS  ${this.hp}/${Boss.MAX_HP}`, w / 2, h / 2)
    this.hpBarTex.needsUpdate = true
  }

  damage(amount: number): boolean {
    if (this.state !== 'alive') return false
    this.hp = Math.max(0, this.hp - amount)
    this.drawHpBar()
    this.sprite.position.x += (Math.random() - 0.5) * 0.15
    if (this.hp <= 0) {
      this.state = 'dying'
      return true
    }
    return false
  }

  update(_now: number, dtMs: number) {
    if (this.state !== 'alive') return
    this.walkFrameTime += dtMs
    if (this.walkFrameTime >= 250) {
      this.walkFrame = (this.walkFrame + 1) % 9
      this.bodyTex.offset.x = this.walkFrame / 9
      this.walkFrameTime -= 250
    }
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.sprite)
    this.bodyTex.dispose()
    this.slashTex.dispose()
    this.hpBarTex.dispose()
    ;(this.sprite.material as THREE.SpriteMaterial).dispose()
    ;(this.hpBarSprite.material as THREE.SpriteMaterial).dispose()
  }
}

class Slime {
  static MAX_HP = 3

  sprite: THREE.Sprite
  tex: THREE.Texture
  hp: number = Slime.MAX_HP
  state: 'alive' | 'dying' = 'alive'
  frame = 0
  frameTime = 0
  position: THREE.Vector3

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    const loader = new THREE.TextureLoader()
    this.tex = loader.load('/assets/sprites/props/slime_enemy.png')
    this.tex.magFilter = THREE.NearestFilter
    this.tex.minFilter = THREE.NearestFilter
    this.tex.colorSpace = THREE.SRGBColorSpace
    this.tex.repeat.set(1 / 4, 1)
    this.tex.offset.set(0, 0)
    const mat = new THREE.SpriteMaterial({ map: this.tex, transparent: true })
    this.sprite = new THREE.Sprite(mat)
    this.sprite.scale.set(1.0, 1.0, 1)
    this.position = position.clone()
    this.sprite.position.copy(position)
    this.sprite.position.y = 0.5
    scene.add(this.sprite)
  }

  update(dtMs: number) {
    if (this.state !== 'alive') return
    this.frameTime += dtMs
    if (this.frameTime >= 200) {
      this.frame = (this.frame + 1) % 4
      this.tex.offset.x = this.frame / 4
      this.frameTime -= 200
    }
  }

  damage(amount: number): boolean {
    if (this.state !== 'alive') return false
    this.hp = Math.max(0, this.hp - amount)
    const knock = (Math.random() - 0.5) * 0.1
    this.sprite.position.x += knock
    this.position.x += knock
    if (this.hp <= 0) {
      this.state = 'dying'
      return true
    }
    return false
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.sprite)
    this.tex.dispose()
    ;(this.sprite.material as THREE.SpriteMaterial).dispose()
  }
}

class Chest {
  static MAX_CLAIMS = 3
  static LIFETIME = 16000

  sprite: THREE.Sprite
  tex: THREE.Texture
  position: THREE.Vector3
  claims = 0
  state: 'closed' | 'opening' | 'open' | 'fading' = 'closed'
  spawnAt: number

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    const loader = new THREE.TextureLoader()
    this.tex = loader.load('/assets/sprites/props/chest.png')
    this.tex.magFilter = THREE.NearestFilter
    this.tex.minFilter = THREE.NearestFilter
    this.tex.colorSpace = THREE.SRGBColorSpace
    this.tex.repeat.set(1 / 4, 1)
    this.tex.offset.set(0, 0)
    const mat = new THREE.SpriteMaterial({ map: this.tex, transparent: true })
    this.sprite = new THREE.Sprite(mat)
    this.sprite.scale.set(0.7, 0.7, 1)
    this.position = position.clone()
    this.sprite.position.copy(position)
    this.sprite.position.y = 0.4
    scene.add(this.sprite)
    this.spawnAt = performance.now()
  }

  claim() {
    if (this.state === 'fading') return false
    this.claims += 1
    this.tex.offset.x = Math.min(this.claims, 3) / 4
    this.state = this.claims >= Chest.MAX_CLAIMS ? 'fading' : 'open'
    return true
  }

  update(now: number) {
    if (now - this.spawnAt > Chest.LIFETIME && this.state !== 'fading') {
      this.state = 'fading'
    }
    if (this.state === 'fading') {
      const mat = this.sprite.material as THREE.SpriteMaterial
      mat.opacity = Math.max(0, mat.opacity - 0.02)
    }
  }

  isDead(): boolean {
    const mat = this.sprite.material as THREE.SpriteMaterial
    return this.state === 'fading' && mat.opacity <= 0.01
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.sprite)
    this.tex.dispose()
    ;(this.sprite.material as THREE.SpriteMaterial).dispose()
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

const magicSigils = new Set<() => void>()

function makeMagicSigilTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.translate(128, 128)
  ctx.strokeStyle = '#a060ff'
  ctx.lineWidth = 4

  ctx.beginPath()
  ctx.arc(0, 0, 110, 0, Math.PI * 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(0, 0, 75, 0, Math.PI * 2)
  ctx.stroke()

  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + i * (Math.PI * 2 / 5)
    const next = -Math.PI / 2 + ((i + 2) % 5) * (Math.PI * 2 / 5)
    ctx.moveTo(Math.cos(angle) * 70, Math.sin(angle) * 70)
    ctx.lineTo(Math.cos(next) * 70, Math.sin(next) * 70)
  }
  ctx.stroke()

  ctx.lineWidth = 2
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 90, Math.sin(a) * 90)
    ctx.lineTo(Math.cos(a) * 105, Math.sin(a) * 105)
    ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function spawnMagicSigil(x: number, z: number) {
  const tex = makeMagicSigilTexture()
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const geom = new THREE.PlaneGeometry(2.0, 2.0)
  const mesh = new THREE.Mesh(geom, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(x, 0.02, z)
  scene.add(mesh)
  const startTime = performance.now()
  const lifetime = 700
  const update = () => {
    const t = (performance.now() - startTime) / lifetime
    if (t >= 1) {
      scene.remove(mesh)
      tex.dispose()
      geom.dispose()
      mat.dispose()
      magicSigils.delete(update)
      return
    }
    mesh.rotation.z = t * Math.PI * 1.5
    mat.opacity = 1 - t
    mesh.scale.setScalar(0.4 + t * 0.6)
  }
  magicSigils.add(update)
}

const DUNGEON_ENTRY = new THREE.Vector3(-1.5, 1, 0.6)
let activeBoss: Boss | null = null
let activeSlime: Slime | null = null
let activeChest: Chest | null = null
let bossDying = false
let slimeDying = false
let smokeSpawnTime = 0
let nextSlimeAt = 0

function spawnBoss() {
  if (activeBoss) return
  activeBoss = new Boss(scene, new THREE.Vector3(DUNGEON_ENTRY.x, 1.5, DUNGEON_ENTRY.z))
  pushLog('⚔ BOSS appeared!', 'attack')
  showBossIntro()
}

function spawnSlime() {
  if (activeSlime) return
  const x = (Math.random() - 0.5) * 5
  const z = (Math.random() - 0.5) * 5
  activeSlime = new Slime(scene, new THREE.Vector3(x, 0.5, z))
  pushLog('⚠ slime appeared!', 'attack')
  const candidates = agents.filter((a) => !inDungeon.has(a.name) && !a.name.startsWith('task-') && !a.name.startsWith('npc-'))
  candidates.sort((a, b) => {
    const da = (a.sprite.position.x - x) ** 2 + (a.sprite.position.z - z) ** 2
    const db = (b.sprite.position.x - x) ** 2 + (b.sprite.position.z - z) ** 2
    return da - db
  })
  for (const a of candidates.slice(0, 3)) {
    a.goto(new THREE.Vector3(
      x + (Math.random() - 0.5) * 1.2,
      1,
      z + (Math.random() - 0.5) * 1.2,
    ))
  }
}

function spawnChest() {
  if (activeChest) return
  activeChest = new Chest(scene, new THREE.Vector3(DUNGEON_ENTRY.x, 0, DUNGEON_ENTRY.z + 0.4))
  pushLog('💰 treasure chest!', 'spawn')
}

function emitGoldBurst(x: number, y: number, z: number) {
  for (let i = 0; i < 8; i++) {
    emitParticle('ember', x + (Math.random() - 0.5) * 0.5, y, z + (Math.random() - 0.5) * 0.5)
  }
}

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

const wallHeight = 2.4
const wallThickness = 0.3
const floorSize = 10
const wallY = wallHeight / 2

const walls = new THREE.Group()
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3a30 })

const northWall = new THREE.Mesh(
  new THREE.BoxGeometry(floorSize + wallThickness * 2, wallHeight, wallThickness),
  wallMaterial,
)
northWall.position.set(0, wallY, -floorSize / 2 - wallThickness / 2)
walls.add(northWall)

const southWall = new THREE.Mesh(
  new THREE.BoxGeometry(floorSize + wallThickness * 2, wallHeight, wallThickness),
  wallMaterial,
)
southWall.position.set(0, wallY, floorSize / 2 + wallThickness / 2)
walls.add(southWall)

const eastWall = new THREE.Mesh(
  new THREE.BoxGeometry(wallThickness, wallHeight, floorSize),
  wallMaterial,
)
eastWall.position.set(floorSize / 2 + wallThickness / 2, wallY, 0)
walls.add(eastWall)

const westWall = new THREE.Mesh(
  new THREE.BoxGeometry(wallThickness, wallHeight, floorSize),
  wallMaterial,
)
westWall.position.set(-floorSize / 2 - wallThickness / 2, wallY, 0)
walls.add(westWall)

scene.add(walls)

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

const saveCrystal = new THREE.Group()
const crystalMesh = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.32, 0),
  new THREE.MeshStandardMaterial({
    color: 0x40c0e0,
    emissive: 0x2080a0,
    emissiveIntensity: 1.2,
    metalness: 0.1,
    roughness: 0.2,
  }),
)
crystalMesh.position.y = 0.9
saveCrystal.add(crystalMesh)

const crystalBase = new THREE.Mesh(
  new THREE.CylinderGeometry(0.35, 0.4, 0.3, 8),
  new THREE.MeshStandardMaterial({ color: 0x303035 }),
)
crystalBase.position.y = 0.15
saveCrystal.add(crystalBase)

const crystalLight = new THREE.PointLight(0x60c0e0, 1.5, 4)
crystalLight.position.y = 0.9
saveCrystal.add(crystalLight)
saveCrystal.position.set(-3.5, 0, 0)
scene.add(saveCrystal)

let crystalSparkleAt = 0

const activeParticles: Particle[] = []
const particlePool: Particle[] = []

function emitParticle(kind: ParticleKind, x: number, y: number, z: number) {
  let p = particlePool.pop()
  if (!p) p = new Particle(scene, kind)
  if (p.kind !== kind) {
    const mat = p.sprite.material as THREE.SpriteMaterial
    const color =
      kind === 'ember' ? 0xff8c3a :
      kind === 'dust' ? 0xc8b8a0 :
      kind === 'heart' ? 0xff7aa8 :
      kind === 'smoke' ? 0xa8a8a8 :
      kind === 'spell' ? 0xa060ff :
      kind === 'rain' ? 0x88a8d0 :
      kind === 'butterfly' ? 0xffd0e0 :
      kind === 'firefly' ? 0xfff080 :
      kind === 'star' ? 0xffffff :
      0xffd870
    const scale =
      kind === 'ember' ? 0.08 :
      kind === 'dust' ? 0.12 :
      kind === 'heart' ? 0.14 :
      kind === 'smoke' ? 0.18 :
      kind === 'rain' ? 0.04 :
      kind === 'butterfly' ? 0.10 :
      kind === 'firefly' ? 0.06 :
      kind === 'star' ? 0.08 :
      0.10
    mat.color.set(color)
    p.sprite.scale.set(scale, scale, 1)
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

const questPostCanvas = document.createElement('canvas')
questPostCanvas.width = 256
questPostCanvas.height = 192
const questPostTex = new THREE.CanvasTexture(questPostCanvas)
questPostTex.colorSpace = THREE.SRGBColorSpace
questPostTex.minFilter = THREE.LinearFilter
questPostTex.magFilter = THREE.LinearFilter
const questPostMat = new THREE.SpriteMaterial({ map: questPostTex, transparent: true, depthTest: false })
const questPostSprite = new THREE.Sprite(questPostMat)
questPostSprite.scale.set(1.4, 1.05, 1)
questPostSprite.position.set(3, 1.4, 3.06)
questPostSprite.visible = false
scene.add(questPostSprite)

function drawQuestPost(text: string | null) {
  const ctx = questPostCanvas.getContext('2d')
  if (!ctx) return
  const w = questPostCanvas.width
  const h = questPostCanvas.height
  ctx.clearRect(0, 0, w, h)
  if (!text) {
    questPostSprite.visible = false
    questPostTex.needsUpdate = true
    return
  }
  ctx.fillStyle = '#f4e8c8'
  ctx.fillRect(8, 8, w - 16, h - 16)
  ctx.strokeStyle = '#3a2e20'
  ctx.lineWidth = 3
  ctx.strokeRect(8, 8, w - 16, h - 16)
  ctx.fillStyle = '#2a1a10'
  ctx.font = 'bold 22px serif'
  ctx.textAlign = 'center'
  ctx.fillText('QUEST', w / 2, 36)
  ctx.font = '18px serif'
  ctx.textBaseline = 'top'
  const lines = wrapText(ctx, text, w - 40, 18)
  let y = 60
  for (const line of lines) {
    ctx.fillText(line, w / 2, y)
    y += 22
  }
  questPostSprite.visible = true
  questPostTex.needsUpdate = true
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, _lineHeight: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const test = current ? current + ' ' + w : w
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = w
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, 5)
}

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

// ダンジョン入口（暗いアーチ）
const dungeon = new THREE.Group()
const dungeonFrame = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 1.8, 0.3),
  new THREE.MeshStandardMaterial({ color: 0x282420 }),
)
dungeonFrame.position.y = 0.9
dungeon.add(dungeonFrame)
// 黒い穴 (奥行きのある暗闇)
const dungeonHole = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 1.3, 0.4),
  new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x100808, emissiveIntensity: 0.3 }),
)
dungeonHole.position.set(0, 0.85, 0.18)
dungeon.add(dungeonHole)
// 上部装飾の小石
const dungeonKeystone = new THREE.Mesh(
  new THREE.BoxGeometry(0.3, 0.2, 0.35),
  new THREE.MeshStandardMaterial({ color: 0x3a3530 }),
)
dungeonKeystone.position.set(0, 1.85, 0.05)
dungeon.add(dungeonKeystone)
dungeon.position.set(-1.5, 0, 0)
scene.add(dungeon)

Agent.landmarks.push({ name: 'fireplace', position: new THREE.Vector3(-3, 1, -2), faceDir: 0 })
Agent.landmarks.push({ name: 'quest-board', position: new THREE.Vector3(3, 1, 2), faceDir: 2 })
Agent.landmarks.push({ name: 'workbench', position: new THREE.Vector3(0, 1, -2), faceDir: 0 })
Agent.landmarks.push({ name: 'library', position: new THREE.Vector3(-3, 1, 2), faceDir: 2 })
Agent.landmarks.push({ name: 'dummy', position: new THREE.Vector3(0, 1, 2), faceDir: 2 })
Agent.landmarks.push({ name: 'door', position: new THREE.Vector3(3, 1, -2), faceDir: 0 })
Agent.landmarks.push({ name: 'dungeon', position: new THREE.Vector3(-1.5, 1, 0.6), faceDir: 0 })
Agent.landmarks.push({ name: 'save-crystal', position: new THREE.Vector3(-3.5, 1, 0.6), faceDir: 0 })

const agents: Agent[] = []
const taskAgents = new Map<string, string>()
let taskCounter = 0
type PartyRole = 'main' | 'archer' | 'healer' | 'mage'
const PARTY_ROLES: PartyRole[] = ['main', 'archer', 'healer', 'mage']
const PARTY_ARCHETYPE_PNG: Record<PartyRole, { walk: string; slash: string }> = {
  main: { walk: '/assets/sprites/legacy/char_main_walk.png', slash: '/assets/sprites/legacy/char_main_slash.png' },
  archer: {
    walk: '/assets/sprites/legacy/char_archer_walk.png',
    slash: '/assets/sprites/legacy/char_archer_slash.png',
  },
  healer: {
    walk: '/assets/sprites/legacy/char_healer_walk.png',
    slash: '/assets/sprites/legacy/char_healer_slash.png',
  },
  mage: { walk: '/assets/sprites/legacy/char_mage_walk.png', slash: '/assets/sprites/legacy/char_mage_slash.png' },
}
const NPC_SPRITES: { walk: string; slash: string; label: string }[] = [
  { walk: '/assets/sprites/legacy/char_peasant_walk.png', slash: '/assets/sprites/legacy/char_peasant_slash.png', label: 'peasant' },
  { walk: '/assets/sprites/legacy/char_healer_walk.png', slash: '/assets/sprites/legacy/char_healer_slash.png', label: 'healer' },
  { walk: '/assets/sprites/legacy/char_archer_walk.png', slash: '/assets/sprites/legacy/char_archer_slash.png', label: 'archer' },
  { walk: '/assets/sprites/legacy/char_rogue_walk.png', slash: '/assets/sprites/legacy/char_rogue_slash.png', label: 'rogue' },
]
type NpcSide = 'north' | 'south' | 'east' | 'west'

interface Party {
  sessionId: string
  sid8: string
  tint: THREE.Color
  members: Map<PartyRole, string>
  createdAt: number
}

const parties = new Map<string, Party>()
const MAX_PARTIES = 3
let npcCounter = 0
const npcAgents = new Set<string>()
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

const victoryEl = (() => {
  const el = document.createElement('div')
  el.id = 'pag-victory'
  el.innerHTML = `
    <div class="pag-victory-title">★ VICTORY ★</div>
    <div class="pag-victory-row">EXP: <span class="pag-victory-num" data-exp>0</span></div>
    <div class="pag-victory-row">GIL: <span class="pag-victory-num" data-gil>0</span></div>
    <div class="pag-victory-row" data-bonus></div>
  `
  document.body.appendChild(el)
  return el
})()

const bossIntroEl = (() => {
  const el = document.createElement('div')
  el.id = 'pag-boss-intro'
  el.innerHTML = `<div class="pag-vs">⚔ VS ⚔</div><div class="pag-bossname">Skeleton Lord</div>`
  document.body.appendChild(el)
  return el
})()

function showBossIntro() {
  bossIntroEl.classList.add('show')
  window.setTimeout(() => bossIntroEl.classList.remove('show'), 2000)
}

function showVictoryPanel() {
  const exp = 80 + Math.floor(Math.random() * 100)
  const gil = 60 + Math.floor(Math.random() * 80)
  const bonusOptions = ['no bonus', 'rare drop!', 'level up!', 'morale +1']
  const bonus = bonusOptions[Math.floor(Math.random() * bonusOptions.length)]
  victoryEl.querySelector<HTMLSpanElement>('[data-exp]')!.textContent = String(exp)
  victoryEl.querySelector<HTMLSpanElement>('[data-gil]')!.textContent = String(gil)
  victoryEl.querySelector<HTMLDivElement>('[data-bonus]')!.textContent = bonus
  victoryEl.classList.add('show')
  window.setTimeout(() => victoryEl.classList.remove('show'), 2800)
  pushLog(`VICTORY! EXP+${exp} GIL+${gil}`, 'spawn')
}

const inDungeon = new Set<string>()
let nextDungeonAt = 0
let nextDramaAt = 0
let nextNpcAt = 0
let nextCrystalVisitAt = 0

function maybeCrystalVisit(now: number) {
  if (nextCrystalVisitAt === 0) nextCrystalVisitAt = now + 25000
  if (now < nextCrystalVisitAt) return
  nextCrystalVisitAt = now + 35000 + Math.random() * 30000
  const candidates = Agent.all.filter((a) => {
    if (inDungeon.has(a.name)) return false
    if (a.name.startsWith('task-')) return false
    if (a.name.startsWith('npc-')) return false
    return a.state === 'idle'
  })
  if (candidates.length === 0) return
  const a = candidates[Math.floor(Math.random() * candidates.length)]
  a.goto(new THREE.Vector3(-3.5, 1, 0.6))
  pushLog(`${a.name} saves at the crystal`, 'idle')
  window.setTimeout(() => {
    for (let i = 0; i < 8; i++) {
      emitParticle('star', -3.5 + (Math.random() - 0.5) * 0.6, 1.3, 0.6 + (Math.random() - 0.5) * 0.4)
    }
  }, 4000)
}

const QUEST_TITLES = [
  'Slay the dungeon skeleton',
  'Recover the lost relic',
  'Investigate strange noises below',
  'Escort the merchant safely',
  'Retrieve the ancient tome',
  'Find the missing apprentice',
  'Defeat the cave dweller',
  'Map the lower halls',
  'Banish the wandering shade',
  'Bring back enchanted herbs',
]

type QuestPhase = 'idle' | 'posted' | 'reading' | 'gathering' | 'in-dungeon' | 'completing'
let questPhase: QuestPhase = 'idle'
let questTitle: string | null = null
let questNextAt = 0
let questReader: Agent | null = null
let questTeam: Agent[] = []
let questPhaseTimer = 0

function isQuestEligible(a: Agent) {
  if (inDungeon.has(a.name)) return false
  if (a.name.startsWith('task-')) return false
  if (a.name.startsWith('npc-')) return false
  if (/^[a-z0-9]{6,}-(main|archer|healer|mage)$/.test(a.name)) return false
  return a.state !== 'attacking'
}

function eligibleQuestTaker(): Agent | null {
  const candidates = Agent.all.filter(isQuestEligible)
  if (candidates.length === 0) return null
  const idleCandidates = candidates.filter((a) => a.state === 'idle')
  const pool = idleCandidates.length > 0 ? idleCandidates : candidates
  const board = Agent.landmarks.find((l) => l.name === 'quest-board')?.position ?? new THREE.Vector3(3, 1, 2)
  return pool.reduce((closest, a) => (
    a.sprite.position.distanceToSquared(board) < closest.sprite.position.distanceToSquared(board) ? a : closest
  ))
}

function postQuest() {
  if (questPhase !== 'idle') return
  questTitle = QUEST_TITLES[Math.floor(Math.random() * QUEST_TITLES.length)]
  drawQuestPost(questTitle)
  questPhase = 'posted'
  questPhaseTimer = performance.now() + 1500
  pushLog(`📜 new quest: ${questTitle}`, 'board')
}

function tickQuest(now: number) {
  if (questPhase === 'idle') {
    if (questNextAt === 0) questNextAt = now + 12000
    if (now >= questNextAt) {
      postQuest()
      questNextAt = now + 35000 + Math.random() * 20000
    }
    return
  }

  if (questPhase === 'posted' && now >= questPhaseTimer) {
    questReader = eligibleQuestTaker()
    if (!questReader) {
      drawQuestPost(null)
      questPhase = 'idle'
      questTitle = null
      return
    }
    inDungeon.add(questReader.name)
    questReader.goto(new THREE.Vector3(3, 1, 2))
    questPhase = 'reading'
    questPhaseTimer = now + 4500
    pushLog(`${questReader.name} takes quest: ${questTitle}`, 'board')
    return
  }

  if (questPhase === 'reading' && now >= questPhaseTimer) {
    questTeam = []
    if (questReader) questTeam.push(questReader)
    const more = Agent.all.filter((a) => {
      if (a === questReader) return false
      return isQuestEligible(a)
    })
    for (let i = more.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[more[i], more[j]] = [more[j], more[i]]
    }
    questTeam.push(...more.slice(0, 2))
    for (const a of questTeam) {
      inDungeon.add(a.name)
      a.goto(new THREE.Vector3(-3, 1, -2))
    }
    questPhase = 'gathering'
    questPhaseTimer = now + 5500
    pushLog('team forms at fireplace', 'fire')
    return
  }

  if (questPhase === 'gathering' && now >= questPhaseTimer) {
    for (const a of questTeam) {
      inDungeon.add(a.name)
      a.goto(new THREE.Vector3(-1.5, 1, 0.6))
    }
    questPhase = 'in-dungeon'
    questPhaseTimer = now + 6000
    pushLog('team enters dungeon (quest)', 'spawn')
    return
  }

  if (questPhase === 'in-dungeon' && now >= questPhaseTimer) {
    for (const a of questTeam) a.sprite.visible = false
    questPhaseTimer = now + 25000
    questPhase = 'completing'
    return
  }

  if (questPhase === 'completing' && now >= questPhaseTimer) {
    for (const a of questTeam) {
      a.sprite.visible = true
      a.sprite.position.set(-1.5 + (Math.random() - 0.5) * 0.6, 1, 0.6 + Math.random() * 0.3)
      inDungeon.delete(a.name)
      a.pickNewTarget()
    }
    for (let i = 0; i < 12; i++) {
      emitParticle('ember', 3 + (Math.random() - 0.5) * 0.8, 1.5, 3 + (Math.random() - 0.5) * 0.4)
    }
    drawQuestPost(null)
    pushLog(`✓ quest complete: ${questTitle}`, 'spawn')
    questPhase = 'idle'
    questTitle = null
    questReader = null
    questTeam = []
  }
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = arr.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

function spawnNpcVisitor() {
  const spec = NPC_SPRITES[Math.floor(Math.random() * NPC_SPRITES.length)]
  npcCounter += 1
  const name = `npc-${spec.label}-${npcCounter}`
  const sides: NpcSide[] = ['north', 'south', 'east', 'west']
  const entrySide = sides[Math.floor(Math.random() * 4)]
  const exitSide = sides.find((s) => s !== entrySide && s !== sideOpposite(entrySide)) || sideOpposite(entrySide)
  const entryPos = sideToEdge(entrySide, true)
  const exitPos = sideToEdge(exitSide, false)
  const tint = new THREE.Color()
  tint.setHSL(Math.random(), 0.4, 0.7)
  tint.r = 0.7 + tint.r * 0.5
  tint.g = 0.7 + tint.g * 0.5
  tint.b = 0.7 + tint.b * 0.5

  const npc = new Agent(scene, spec.walk, entryPos, name, {
    tint,
    sword: {
      bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
      fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
    },
    slashUrl: spec.slash,
  })
  agents.push(npc)
  npcAgents.add(name)
  pushLog(`NPC ${spec.label} entered`, 'idle')
  npc.goto(exitPos)
}

let nextChocoboAt = 0
let activeChocobo: {
  sprite: THREE.Sprite
  tex: THREE.Texture
  velocityX: number
  spawnAt: number
  frame: number
  frameTime: number
} | null = null

function spawnChocobo() {
  if (activeChocobo) return
  const loader = new THREE.TextureLoader()
  const tex = loader.load('/assets/sprites/props/chocobo.png')
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  tex.repeat.set(1 / 4, 1)
  tex.offset.set(0, 0)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(1.4, 1.4, 1)
  const fromLeft = Math.random() < 0.5
  const startX = fromLeft ? -6 : 6
  const z = (Math.random() - 0.5) * 4
  sprite.position.set(startX, 0.7, z)
  scene.add(sprite)
  activeChocobo = {
    sprite,
    tex,
    velocityX: fromLeft ? 4.5 : -4.5,
    spawnAt: performance.now(),
    frame: 0,
    frameTime: 0,
  }
  pushLog('🐤 chocobo dashes through!', 'spawn')
}

function sideOpposite(s: NpcSide): NpcSide {
  return s === 'north' ? 'south' : s === 'south' ? 'north' : s === 'east' ? 'west' : 'east'
}

function sideToEdge(side: NpcSide, entry: boolean): THREE.Vector3 {
  const offset = entry ? 4.2 : 3.8
  if (side === 'north') return new THREE.Vector3((Math.random() - 0.5) * 6, 1, -offset)
  if (side === 'south') return new THREE.Vector3((Math.random() - 0.5) * 6, 1, offset)
  if (side === 'east') return new THREE.Vector3(offset, 1, (Math.random() - 0.5) * 6)
  return new THREE.Vector3(-offset, 1, (Math.random() - 0.5) * 6)
}

function startDungeonRun() {
  // task subagent と party member は除外、default 10 体だけ対象
  const candidates = agents.filter((a) => {
    if (inDungeon.has(a.name)) return false
    if (a.name.startsWith('task-')) return false
    if (a.name.startsWith('npc-')) return false
    // party member (sid8-role) も除外
    const partyish = /^[a-z0-9]{6,}-(main|archer|healer|mage)$/.test(a.name)
    return !partyish
  })
  if (candidates.length < 3) return
  const team = pickRandom(candidates, 3)
  for (const a of team) {
    inDungeon.add(a.name)
    a.goto(new THREE.Vector3(-1.5, 1, 0.6))
  }
  pushLog(`team ${team.map((a) => a.name).join(',')} → dungeon`, 'spawn')

  window.setTimeout(() => {
    for (const a of team) {
      if (inDungeon.has(a.name)) a.sprite.visible = false
    }
    pushLog('team entered dungeon', 'fire')
  }, 5500)

  const stayDuration = 25000 + Math.random() * 10000
  window.setTimeout(() => {
    for (const a of team) {
      if (!inDungeon.has(a.name)) continue
      a.sprite.visible = true
      a.sprite.position.set(-1.5 + (Math.random() - 0.5) * 0.4, 1, 0.6 + Math.random() * 0.3)
      inDungeon.delete(a.name)
      a.pickNewTarget()
    }
    pushLog('team returned from dungeon', 'spawn')
    if (Math.random() < 0.35 && !activeBoss) {
      spawnBoss()
      // フォーメーション配置: ボス位置 (-1.5, 1, 0.6) から半径 2 の半円弧 (front-facing 側、Z+ 方向)
      const bossX = -1.5
      const bossZ = 0.6
      const eligible = agents.filter((a) => !inDungeon.has(a.name) && !a.name.startsWith('task-') && !a.name.startsWith('npc-'))
      const slotCount = Math.min(eligible.length, 8)
      eligible.slice(0, slotCount).forEach((a, i) => {
        // 角度は手前側 (theta in [PI/4, 3PI/4]、つまり Z+ 半円)
        const theta = Math.PI / 4 + (Math.PI / 2) * (slotCount === 1 ? 0.5 : i / (slotCount - 1))
        const radius = 2.0
        const x = bossX + Math.cos(theta) * radius
        const z = bossZ + Math.sin(theta) * radius
        a.goto(new THREE.Vector3(x, 1, z))
      })
      pushLog('battle formation!', 'attack')
    }
  }, 5500 + stayDuration)
}

function pickIdleNonDungeon(): Agent[] {
  return Agent.all.filter((a) => {
    if (inDungeon.has(a.name)) return false
    if (a.state !== 'idle') return false
    if (a.name.startsWith('task-')) return false
    if (a.name.startsWith('npc-')) return false
    return true
  })
}

function runDrama() {
  const idle = pickIdleNonDungeon()
  if (idle.length < 2) return
  const kind = Math.floor(Math.random() * 4)
  if (kind === 0) {
    const team = pickRandom(idle, Math.min(idle.length, 3))
    for (const a of team) a.goto(new THREE.Vector3(-3, 1, -2))
    pushLog(`drama: ${team.length} agents gather at fireplace`, 'fire')
  } else if (kind === 1) {
    const pair = pickRandom(idle, 2)
    for (const a of pair) a.goto(new THREE.Vector3(0, 1, 2))
    pushLog(`drama: ${pair[0].name} vs ${pair[1].name} sparring`, 'attack')
  } else if (kind === 2) {
    const pair = pickRandom(idle, 2)
    const emote = (Agent as any).EMOTES[Math.floor(Math.random() * (Agent as any).EMOTES.length)]
    for (const a of pair) a.showTool(emote, 2200)
    pushLog(`drama: ${pair[0].name} ${emote} ${pair[1].name}`, 'idle')
  } else {
    const a = pickRandom(idle, 1)[0]
    const cx = (Math.random() < 0.5 ? -1 : 1) * 3.5
    const cz = (Math.random() < 0.5 ? -1 : 1) * 3.5
    a.goto(new THREE.Vector3(cx, 1, cz))
    pushLog(`drama: ${a.name} patrol`, 'board')
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

function partyTintFromSid(sid: string): THREE.Color {
  let h = 0
  for (let i = 0; i < sid.length; i++) h = (h * 31 + sid.charCodeAt(i)) >>> 0
  const hue = (h % 360) / 360
  const c = new THREE.Color()
  c.setHSL(hue, 0.5, 0.65)
  c.r = 0.7 + c.r * 0.5
  c.g = 0.7 + c.g * 0.5
  c.b = 0.7 + c.b * 0.5
  return c
}

function makePartyMemberName(sid8: string, role: PartyRole): string {
  return `${sid8}-${role}`
}

function createParty(sessionId: string) {
  if (parties.has(sessionId)) return parties.get(sessionId)!

  if (parties.size >= MAX_PARTIES) {
    let oldestId = ''
    let oldestT = Infinity
    for (const [k, v] of parties) {
      if (v.createdAt < oldestT) {
        oldestT = v.createdAt
        oldestId = k
      }
    }
    if (oldestId) destroyParty(oldestId)
  }

  const sid8 = sessionId.slice(0, 8) || 's' + Math.random().toString(36).slice(2, 9)
  const tint = partyTintFromSid(sid8)
  const members = new Map<PartyRole, string>()
  const baseStart = new THREE.Vector3(3, 1, -2)

  PARTY_ROLES.forEach((role, i) => {
    const name = makePartyMemberName(sid8, role)
    const start = new THREE.Vector3(
      baseStart.x + (Math.random() - 0.5) * 0.6,
      1,
      baseStart.z + (Math.random() - 0.5) * 0.6 + i * 0.3,
    )
    const archetype = PARTY_ARCHETYPE_PNG[role]
    const a = new Agent(scene, archetype.walk, start, name, {
      tint,
      sword: {
        bg: '/assets/sprites/weapon/sword_arming_walk_bg.png',
        fg: '/assets/sprites/weapon/sword_arming_walk_fg.png',
      },
      slashUrl: archetype.slash,
    })
    agents.push(a)
    members.set(role, name)
    a.goto(new THREE.Vector3((Math.random() - 0.5) * 4, 1, (Math.random() - 0.5) * 4))
  })

  const party: Party = { sessionId, sid8, tint, members, createdAt: performance.now() }
  parties.set(sessionId, party)
  pushLog(`party ${sid8} joined`, 'spawn')
  return party
}

function destroyParty(sessionId: string) {
  const p = parties.get(sessionId)
  if (!p) return
  for (const name of p.members.values()) {
    window.pag.dispatch({ type: 'remove', agentId: name })
  }
  parties.delete(sessionId)
  pushLog(`party ${p.sid8} left`, 'remove')
}

function escortPartyToDoor(sessionId: string) {
  const p = parties.get(sessionId)
  if (!p) return
  const door = Agent.landmarks.find((l) => l.name === 'door')
  if (!door) return
  for (const name of p.members.values()) {
    window.pag.dispatch({ type: 'goto', agentId: name, landmark: 'door' })
  }
  pushLog(`party ${p.sid8} -> door`, 'idle')
  window.setTimeout(() => destroyParty(sessionId), 5000)
}

class AudioManager {
  ctx: AudioContext | null = null
  masterGain: GainNode | null = null
  crackleTimerId: number | null = null
  muted = true

  async ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = this.muted ? 0 : 0.4
      this.masterGain.connect(this.ctx.destination)
      this.startCrackle()
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.ctx!.currentTime)
      this.masterGain.gain.setTargetAtTime(m ? 0 : 0.4, this.ctx!.currentTime, 0.05)
    }
  }

  startCrackle() {
    if (!this.ctx || !this.masterGain) return
    const tick = () => {
      if (!this.ctx) return
      const dur = 0.04 + Math.random() * 0.04
      const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
      }
      const src = this.ctx.createBufferSource()
      src.buffer = buf
      const filter = this.ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = 800 + Math.random() * 1500
      filter.Q.value = 5
      const gain = this.ctx.createGain()
      gain.gain.value = 0.15 + Math.random() * 0.25
      src.connect(filter).connect(gain).connect(this.masterGain!)
      src.start()
      this.crackleTimerId = window.setTimeout(tick, 80 + Math.random() * 270)
    }
    tick()
  }

  playFootstep() {
    if (!this.ctx || !this.masterGain || this.muted) return
    const dur = 0.05
    const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.5
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 250
    const gain = this.ctx.createGain()
    gain.gain.value = 0.2
    src.connect(filter).connect(gain).connect(this.masterGain)
    src.start()
  }
}

const audio = new AudioManager()

let audioInitialized = false
function initAudioOnGesture() {
  if (audioInitialized) return
  audioInitialized = true
  audio.ensure()
}
document.addEventListener('click', initAudioOnGesture, { once: true })
document.addEventListener('keydown', initAudioOnGesture, { once: true })

const audioToggle = document.createElement('div')
audioToggle.id = 'pag-audio-toggle'
audioToggle.textContent = '🔇 sound'
audioToggle.addEventListener('click', () => {
  audio.ensure()
  const newMuted = !audio.muted
  audio.setMuted(newMuted)
  audioToggle.textContent = newMuted ? '🔇 sound' : '🔊 sound'
  audioToggle.classList.toggle('on', !newMuted)
})
document.body.appendChild(audioToggle)

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

type Weather = 'clear' | 'rainy'

let currentWeather: Weather = 'clear'
let weatherEndAt = 0
let nextWeatherCheckAt = 0
let lightningEndAt = 0
let lightningNextAt = 0
let rainSpawnTime = 0
let nextFlyerAt = 0

type ToD = 'morning' | 'day' | 'evening' | 'night'

function timeOfDay(): ToD {
  const h = new Date().getHours()
  if (h >= 5 && h < 10) return 'morning'
  if (h >= 10 && h < 17) return 'day'
  if (h >= 17 && h < 20) return 'evening'
  return 'night'
}

function startRain() {
  currentWeather = 'rainy'
  weatherEndAt = performance.now() + 30000 + Math.random() * 30000
  pushLog('☔ rain starts', 'idle')
  applyTimeOfDay(timeOfDay())
}

function endRain() {
  currentWeather = 'clear'
  lightningEndAt = 0
  pushLog('☀ rain stops', 'idle')
  applyTimeOfDay(timeOfDay())
}

function maybeLightning(now: number) {
  if (currentWeather !== 'rainy') {
    lightningEndAt = 0
    lightningNextAt = 0
    return
  }
  if (lightningNextAt === 0) lightningNextAt = now + 4000 + Math.random() * 8000
  if (now >= lightningNextAt) {
    lightningEndAt = now + 120
    lightningNextAt = now + 4000 + Math.random() * 10000
    pushLog('⚡ lightning', 'attack')
  }
  if (lightningEndAt > now) {
    ambientLight.intensity = 2.0
    directionalLight.intensity = 3.0
    scene.background = new THREE.Color(0xc8d0e0)
    return
  }
  if (lightningEndAt !== 0) {
    lightningEndAt = 0
    applyTimeOfDay(timeOfDay())
  }
}

function spawnFlyer(_now: number) {
  const tod = timeOfDay()
  if (currentWeather === 'rainy') return

  if (tod === 'morning' || tod === 'day') {
    emitParticle(
      'butterfly',
      (Math.random() - 0.5) * 7,
      1.2 + Math.random() * 0.6,
      (Math.random() - 0.5) * 7,
    )
  } else if (tod === 'evening') {
    if (Math.random() < 0.3) {
      emitParticle(
        'butterfly',
        (Math.random() - 0.5) * 7,
        1.0 + Math.random() * 0.5,
        (Math.random() - 0.5) * 7,
      )
    }
  } else {
    for (let i = 0; i < 2; i++) {
      emitParticle(
        'firefly',
        -3 + (Math.random() - 0.5) * 3,
        0.5 + Math.random() * 1.5,
        -3 + (Math.random() - 0.5) * 3,
      )
    }
    if (Math.random() < 0.06) {
      emitParticle(
        'star',
        -4 + Math.random() * 8,
        3.5 + Math.random() * 0.5,
        -4 + Math.random() * 0.5,
      )
    }
  }
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

  if (currentWeather === 'rainy') {
    ambientLight.intensity *= 0.55
    directionalLight.intensity *= 0.45
    scene.background = new THREE.Color(0x14181c)
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
  if (activeBoss) activeBoss.update(now, dtMs)
  if (activeBoss && activeBoss.hp <= 0 && !bossDying) {
    bossDying = true
    pushLog('💀 boss defeated!', 'spawn')
    showVictoryPanel()
    window.setTimeout(() => {
      if (activeBoss) {
        activeBoss.dispose(scene)
        activeBoss = null
      }
      spawnChest()
      bossDying = false
    }, 800)
  }
  if (activeSlime) {
    activeSlime.update(dtMs)
    if (activeSlime.hp <= 0 && !slimeDying) {
      slimeDying = true
      const sx = activeSlime.position.x
      const sz = activeSlime.position.z
      for (let i = 0; i < 6; i++) {
        emitParticle('ember', sx + (Math.random() - 0.5) * 0.5, 0.5, sz + (Math.random() - 0.5) * 0.5)
      }
      pushLog('slime defeated!', 'spawn')
      window.setTimeout(() => {
        if (activeSlime) {
          activeSlime.dispose(scene)
          activeSlime = null
        }
        slimeDying = false
      }, 500)
    }
  } else {
    if (nextSlimeAt === 0) nextSlimeAt = now + 30000
    if (now >= nextSlimeAt && !activeBoss && currentWeather === 'clear') {
      spawnSlime()
      nextSlimeAt = now + 60000 + Math.random() * 60000
    }
  }
  if (activeChest) {
    activeChest.update(now)
    if (activeChest.isDead()) {
      activeChest.dispose(scene)
      activeChest = null
    }
  }
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
  smokeSpawnTime += dtMs
  while (smokeSpawnTime >= 200) {
    smokeSpawnTime -= 200
    emitParticle(
      'smoke',
      -3 + (Math.random() - 0.5) * 0.4,
      1.7 + Math.random() * 0.2,
      -3 + 0.2 + Math.random() * 0.2,
    )
  }
  crystalMesh.rotation.y += dtMs / 800
  crystalLight.intensity = 1.1 + Math.sin(now / 500) * 0.4
  if (now >= crystalSparkleAt) {
    crystalSparkleAt = now + 600
    emitParticle('firefly', -3.5 + (Math.random() - 0.5) * 0.4, 0.8 + Math.random() * 0.3, (Math.random() - 0.5) * 0.4)
  }
  maybeCrystalVisit(now)
  if (nextWeatherCheckAt === 0) nextWeatherCheckAt = now + 60000
  if (now >= nextWeatherCheckAt) {
    if (currentWeather === 'clear' && Math.random() < 0.4) {
      startRain()
    }
    nextWeatherCheckAt = now + 90000 + Math.random() * 90000
  }
  if (currentWeather === 'rainy' && now >= weatherEndAt) {
    endRain()
  }
  maybeLightning(now)
  if (currentWeather === 'rainy') {
    rainSpawnTime += dtMs
    while (rainSpawnTime >= 18) {
      rainSpawnTime -= 18
      emitParticle(
        'rain',
        (Math.random() - 0.5) * 12,
        4 + Math.random() * 2,
        (Math.random() - 0.5) * 12,
      )
    }
  } else {
    rainSpawnTime = 0
  }
  if (nextFlyerAt === 0) nextFlyerAt = now + 1000
  if (now >= nextFlyerAt) {
    spawnFlyer(now)
    nextFlyerAt = now + 800 + Math.random() * 800
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
  for (let i = floatingNumbers.length - 1; i >= 0; i--) {
    if (!floatingNumbers[i].update(dtMs)) {
      floatingNumbers[i].dispose(scene)
      floatingNumbers.splice(i, 1)
    }
  }
  for (const update of magicSigils) update()
  updateParticles(dtMs)
  if (nextDungeonAt === 0) nextDungeonAt = now + 12000
  if (now >= nextDungeonAt) {
    startDungeonRun()
    nextDungeonAt = now + 30000 + Math.random() * 15000
  }
  if (nextNpcAt === 0) nextNpcAt = now + 15000
  if (now >= nextNpcAt) {
    spawnNpcVisitor()
    nextNpcAt = now + 45000 + Math.random() * 45000
  }
  if (activeChocobo) {
    const c = activeChocobo
    c.sprite.position.x += c.velocityX * (dtMs / 1000)
    c.frameTime += dtMs
    if (c.frameTime >= 100) {
      c.frame = (c.frame + 1) % 4
      c.tex.offset.x = c.frame / 4
      c.frameTime -= 100
    }
    if (Math.abs(c.sprite.position.x) > 6.5) {
      scene.remove(c.sprite)
      c.tex.dispose()
      ;(c.sprite.material as THREE.SpriteMaterial).dispose()
      activeChocobo = null
    }
  } else {
    if (nextChocoboAt === 0) nextChocoboAt = now + 90000
    if (now >= nextChocoboAt) {
      spawnChocobo()
      nextChocoboAt = now + 120000 + Math.random() * 120000
    }
  }
  if (nextDramaAt === 0) nextDramaAt = now + 5000
  if (inDungeon.size > 0 && now >= nextDramaAt) {
    runDrama()
    nextDramaAt = now + 8000 + Math.random() * 7000
  }
  tickQuest(now)
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
  const sessionId: string = payload.session_id || ''
  const party = sessionId ? parties.get(sessionId) : undefined

  if (hookName === 'SessionStart' && sessionId) {
    createParty(sessionId)
    pushLog(`session ${sessionId.slice(0, 8)} start`, 'spawn')
    return
  }

  if (hookName === 'Stop' && sessionId) {
    if (parties.has(sessionId)) escortPartyToDoor(sessionId)
    return
  }

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

      if (party) {
        const role: PartyRole =
          toolName === 'Bash' || toolName === 'Write' || toolName === 'Edit'
            ? 'main'
            : toolName === 'Read' || toolName === 'Grep' || toolName === 'Glob'
              ? 'archer'
              : toolName === 'WebSearch' || toolName === 'WebFetch'
                ? 'mage'
                : 'healer'
        const memberName = party.members.get(role)
        if (memberName) {
          window.pag.dispatch({ type: 'show-tool', agentId: memberName, toolName })
          if (role === 'main') {
            const landmark = toolName === 'Bash' ? 'workbench' : 'dummy'
            window.pag.dispatch({ type: 'goto', agentId: memberName, landmark })
            if (toolName !== 'Bash') attackWhenNearLandmark(memberName, landmark)
          } else if (role === 'archer') {
            window.pag.dispatch({ type: 'goto', agentId: memberName, landmark: 'library' })
          } else if (role === 'mage') {
            window.pag.dispatch({ type: 'goto', agentId: memberName, landmark: 'quest-board' })
          } else {
            window.pag.dispatch({ type: 'goto', agentId: memberName, landmark: 'fireplace' })
          }
          pushLog(`${party.sid8}/${role} -> ${toolName}`, role === 'main' ? 'attack' : 'board')
        }
        return
      }
      if (sessionId) return

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
      if (party) {
        const memberName = party.members.get('main')
        if (memberName) window.pag.dispatch({ type: 'idle', agentId: memberName, durationMs: 1500 })
        return
      }
      if (sessionId) return
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
