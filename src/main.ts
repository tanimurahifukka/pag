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

let frame = 0
let lastFrameTime = 0
const FRAME_DURATION = 120

function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  if (now - lastFrameTime >= FRAME_DURATION) {
    frame = (frame + 1) % 9
    bodyTex.offset.x = frame / 9
    lastFrameTime = now
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
