<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, shallowRef, computed } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// Types
interface Point3D { x: number; y: number; z: number }
type LossType = 'quadratic' | 'rosenbrock' | 'beale'

// Loss functions
function lossFunction(w1: number, w2: number): number {
  return w1 * w1 + w2 * w2
}

function rosenbrockFunction(w1: number, w2: number): number {
  return Math.pow(1 - w1, 2) + 5 * Math.pow(w2 - w1 * w1, 2)
}

function bealeFunction(w1: number, w2: number): number {
  const t1 = Math.pow(1.5 - w1 + w1 * w2, 2)
  const t2 = Math.pow(2.25 - w1 + w1 * w2 * w2, 2)
  const t3 = Math.pow(2.625 - w1 + w1 * w2 * w2 * w2, 2)
  return (t1 + t2 + t3) / 50
}

// Loss configs
const lossConfigs: Record<LossType, {
  name: string; description: string; formula: string; gradient: string
  startPoint: { x: number; y: number }
}> = {
  quadratic: {
    name: '二次函数 (Quadratic)',
    description: '最简单的凸优化问题，全局最优解在原点',
    formula: 'L(w₁, w₂) = w₁² + w₂²',
    gradient: '∇L = [2w₁, 2w₂]',
    startPoint: { x: 3, y: 3 }
  },
  rosenbrock: {
    name: 'Rosenbrock函数 (香蕉谷)',
    description: '经典优化测试函数，具有狭窄的抛物线形山谷',
    formula: 'L(w₁, w₂) = (1-w₁)² + 5(w₂-w₁²)²',
    gradient: '∇L = [-2(1-w₁)-20w₁(w₂-w₁²), 10(w₂-w₁²)]',
    startPoint: { x: -2, y: 2 }
  },
  beale: {
    name: 'Beale函数 (复杂地形)',
    description: '多个局部极值点，优化难度较大',
    formula: 'L(w₁,w₂) = (1.5-w₁+w₁w₂)² + (2.25-w₁+w₁w₂²)² + (2.625-w₁+w₁w₂³)²',
    gradient: '复杂梯度 (数值计算)',
    startPoint: { x: -3, y: 2 }
  }
}
// State
const canvasRef = ref<HTMLCanvasElement | null>(null)
const lossType = ref<LossType>('quadratic')
const showGradientPath = ref(false)
const learningRate = ref(0.1)
const isTraining = ref(false)
const gradientPath = ref<Point3D[]>([])

// Three.js objects - use shallowRef (no deep reactivity)
const renderer = shallowRef<THREE.WebGLRenderer | null>(null)
const scene = shallowRef<THREE.Scene | null>(null)
const camera = shallowRef<THREE.PerspectiveCamera | null>(null)
const controls = shallowRef<OrbitControls | null>(null)
let animationId: number | null = null
let surfaceMesh: THREE.Mesh | null = null
let pathGroup: THREE.Group | null = null

// Computed
const currentConfig = computed(() => lossConfigs[lossType.value])

// Helper: select loss function by type
function getLossFunc(type: string): (x: number, y: number) => number {
  if (type === 'quadratic') return lossFunction
  if (type === 'rosenbrock') return (x: number, y: number) => rosenbrockFunction(x, y) * 0.1
  return bealeFunction
}

// --- Surface builder ---
function buildSurface() {
  if (!scene.value) return
  // Remove old mesh
  if (surfaceMesh) {
    scene.value.remove(surfaceMesh)
    surfaceMesh.geometry.dispose()
    ;(surfaceMesh.material as THREE.Material).dispose()
  }
  if (pathGroup) {
    scene.value.remove(pathGroup)
    pathGroup = null
  }

  const resolution = 50
  const size = 4
  const geom = new THREE.PlaneGeometry(size * 2, size * 2, resolution, resolution)
  const pos = geom.attributes.position.array as Float32Array
  const colors = new Float32Array((pos.length / 3) * 3)
  const f = getLossFunc(lossType.value)
  let minZ = Infinity
  let maxZ = -Infinity
  const zVals: number[] = []

  for (let i = 0; i < pos.length; i += 3) {
    const z = f(pos[i], pos[i + 1])
    zVals.push(z)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }

  for (let i = 0; i < pos.length; i += 3) {
    const z = zVals[i / 3]
    pos[i + 2] = z
    const t = maxZ > minZ ? (z - minZ) / (maxZ - minZ) : 0
    colors[i] = t           // R
    colors[i + 1] = 0.3 * (1 - t) + 0.7 * t // G
    colors[i + 2] = 1 - t   // B
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geom.computeVertexNormals()

  const mat = new THREE.MeshPhongMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    shininess: 30,
    transparent: true,
    opacity: 0.85
  })

  surfaceMesh = new THREE.Mesh(geom, mat)
  scene.value.add(surfaceMesh)

  // Rebuild path if showing
  if (showGradientPath.value && gradientPath.value.length > 0) {
    buildPath()
  }
}
// --- Path builder ---
function buildPath() {
  if (!scene.value || gradientPath.value.length < 2) return
  if (pathGroup) {
    scene.value.remove(pathGroup)
  }

  pathGroup = new THREE.Group()
  const points = gradientPath.value

  // Line connecting all points
  const positions = new Float32Array(points.length * 3)
  points.forEach((p, i) => {
    positions[i * 3] = p.x
    positions[i * 3 + 1] = p.y
    positions[i * 3 + 2] = p.z
  })
  const lineGeom = new THREE.BufferGeometry()
  lineGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  pathGroup.add(new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ color: 0x00D9FF })))

  // Spheres at each step
  points.forEach((p, idx) => {
    const color = idx === 0 ? 0x00FF88 : idx === points.length - 1 ? 0xFF3366 : 0x00D9FF
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 16, 16),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 })
    )
    sphere.position.set(p.x, p.y, p.z)
    pathGroup!.add(sphere)
  })

  scene.value.add(pathGroup)
}

// --- Animation loop ---
function animate() {
  animationId = requestAnimationFrame(animate)
  controls.value?.update()
  if (renderer.value && scene.value && camera.value) {
    renderer.value.render(scene.value, camera.value)
  }
}
// --- Gradient descent ---
function computeGradient(w1: number, w2: number) {
  const h = 0.0001
  const f = getLossFunc(lossType.value)
  return {
    dw1: (f(w1 + h, w2) - f(w1 - h, w2)) / (2 * h),
    dw2: (f(w1, w2 + h) - f(w1, w2 - h)) / (2 * h)
  }
}

function runGradientDescent() {
  isTraining.value = true
  const config = lossConfigs[lossType.value]
  let w1 = config.startPoint.x
  let w2 = config.startPoint.y
  const f = getLossFunc(lossType.value)
  const path: Point3D[] = [{ x: w1, y: w2, z: f(w1, w2) }]

  for (let i = 0; i < 100; i++) {
    const { dw1, dw2 } = computeGradient(w1, w2)
    w1 = Math.max(-4, Math.min(4, w1 - learningRate.value * dw1))
    w2 = Math.max(-4, Math.min(4, w2 - learningRate.value * dw2))
    path.push({ x: w1, y: w2, z: f(w1, w2) })
    if (Math.sqrt(dw1 * dw1 + dw2 * dw2) < 0.001) break
  }

  gradientPath.value = path
  showGradientPath.value = true
  isTraining.value = false
}

function resetVisualization() {
  gradientPath.value = []
  showGradientPath.value = false
  isTraining.value = false
}
// --- Watchers ---
watch(lossType, () => {
  resetVisualization()
  buildSurface()
})

watch([showGradientPath, gradientPath], () => {
  if (showGradientPath.value) {
    buildPath()
  } else if (pathGroup && scene.value) {
    scene.value.remove(pathGroup)
    pathGroup = null
  }
})

// --- Resize handler ---
function handleResize() {
  if (!canvasRef.value || !renderer.value || !camera.value) return
  const container = canvasRef.value.parentElement!
  const width = container.clientWidth
  const height = 500
  renderer.value.setSize(width, height)
  camera.value.aspect = width / height
  camera.value.updateProjectionMatrix()
}
// --- Lifecycle ---
onMounted(() => {
  if (!canvasRef.value) return
  const container = canvasRef.value.parentElement!
  const width = container.clientWidth
  const height = 500

  // Renderer
  const r = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true, alpha: true })
  r.setSize(width, height)
  r.setPixelRatio(window.devicePixelRatio)
  renderer.value = r

  // Scene
  const s = new THREE.Scene()
  scene.value = s

  // Camera
  const cam = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
  cam.position.set(8, 8, 8)
  cam.lookAt(0, 0, 0)
  camera.value = cam

  // Controls
  const ctrl = new OrbitControls(cam, r.domElement)
  ctrl.enablePan = true
  ctrl.enableZoom = true
  ctrl.maxPolarAngle = Math.PI / 2
  ctrl.minDistance = 5
  ctrl.maxDistance = 20
  controls.value = ctrl

  // Lights
  s.add(new THREE.AmbientLight(0xffffff, 0.5))
  const dir1 = new THREE.DirectionalLight(0xffffff, 0.8)
  dir1.position.set(10, 10, 5)
  s.add(dir1)
  const dir2 = new THREE.DirectionalLight(0xffffff, 0.3)
  dir2.position.set(-10, -10, -5)
  s.add(dir2)

  // Grid helper
  const gridHelper = new THREE.GridHelper(8, 16, 0x2A3C52, 0x2A3C52)
  gridHelper.position.y = -0.01
  s.add(gridHelper)

  buildSurface()
  animate()

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (animationId) cancelAnimationFrame(animationId)
  renderer.value?.dispose()
  controls.value?.dispose()
})
</script>
<template>
  <div class="ls-container">
    <div class="ls-canvas-wrapper">
      <canvas ref="canvasRef" />
    </div>

    <div class="ls-controls">
      <!-- Loss type selector -->
      <div class="ls-section">
        <div class="ls-section-title">损失函数类型</div>
        <div class="ls-button-group">
          <button
            v-for="key in (['quadratic', 'rosenbrock', 'beale'] as const)"
            :key="key"
            class="ls-type-btn"
            :class="{ 'ls-type-btn--active': lossType === key }"
            @click="lossType = key"
          >
            {{ lossConfigs[key].name }}
          </button>
        </div>
      </div>

      <!-- Learning rate slider -->
      <div class="ls-section">
        <div class="ls-section-title">
          学习率: <span class="ls-value">{{ learningRate.toFixed(2) }}</span>
        </div>
        <input
          v-model.number="learningRate"
          type="range"
          class="ls-slider"
          min="0.01"
          max="0.5"
          step="0.01"
        />
      </div>

      <!-- Action buttons -->
      <div class="ls-section">
        <div class="ls-action-buttons">
          <button
            class="ls-btn ls-btn--primary"
            :disabled="isTraining"
            @click="runGradientDescent"
          >
            {{ isTraining ? '运行中...' : '运行梯度下降' }}
          </button>
          <button
            class="ls-btn ls-btn--secondary"
            @click="resetVisualization(); buildSurface()"
          >
            重置
          </button>
        </div>
      </div>
      <!-- Iteration count -->
      <div v-if="gradientPath.length > 0" class="ls-section">
        <div class="ls-iteration-info">
          迭代次数: <span class="ls-value">{{ gradientPath.length - 1 }}</span>
        </div>
      </div>

      <!-- Function info -->
      <div class="ls-section ls-info-panel">
        <div class="ls-info-title">{{ currentConfig.name }}</div>
        <div class="ls-info-desc">{{ currentConfig.description }}</div>
        <div class="ls-info-formula">
          <span class="ls-label">公式:</span> {{ currentConfig.formula }}
        </div>
        <div class="ls-info-gradient">
          <span class="ls-label">梯度:</span> {{ currentConfig.gradient }}
        </div>
      </div>

      <!-- Legend -->
      <div class="ls-section ls-legend">
        <div class="ls-legend-title">图例</div>
        <div class="ls-legend-items">
          <div class="ls-legend-item">
            <span class="ls-legend-dot ls-legend-dot--start"></span>
            <span>起始点</span>
          </div>
          <div class="ls-legend-item">
            <span class="ls-legend-dot ls-legend-dot--path"></span>
            <span>优化路径</span>
          </div>
          <div class="ls-legend-item">
            <span class="ls-legend-dot ls-legend-dot--end"></span>
            <span>终止点</span>
          </div>
        </div>
        <div class="ls-legend-hint">拖拽旋转 · 滚轮缩放 · 右键平移</div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.ls-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.ls-canvas-wrapper {
  position: relative;
  width: 100%;
  height: 500px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.ls-canvas-wrapper canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.ls-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ls-section {
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}

.ls-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 10px;
}

.ls-button-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ls-type-btn {
  flex: 1;
  min-width: 140px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.ls-type-btn:hover {
  border-color: var(--vp-c-brand-1);
}

.ls-type-btn--active {
  border-color: var(--vp-c-brand-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 10%, transparent);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.ls-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--vp-c-divider);
  border-radius: 3px;
  outline: none;
}

.ls-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.ls-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.ls-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  cursor: pointer;
  border: none;
}
.ls-value {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.ls-action-buttons {
  display: flex;
  gap: 10px;
}

.ls-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.25s ease;
}

.ls-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ls-btn--primary {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}

.ls-btn--primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.ls-btn--secondary {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-divider);
}

.ls-btn--secondary:hover {
  border-color: var(--vp-c-brand-1);
}

.ls-iteration-info {
  font-size: 14px;
  color: var(--vp-c-text-1);
}
.ls-info-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ls-info-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.ls-info-desc {
  font-size: 13px;
  color: var(--vp-c-text-1);
  opacity: 0.7;
  line-height: 1.5;
}

.ls-info-formula,
.ls-info-gradient {
  font-size: 13px;
  color: var(--vp-c-text-1);
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.ls-label {
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.ls-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ls-legend-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.ls-legend-items {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.ls-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--vp-c-text-1);
}
.ls-legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.ls-legend-dot--start {
  background: #00FF88;
}

.ls-legend-dot--path {
  background: #00D9FF;
}

.ls-legend-dot--end {
  background: #FF3366;
}

.ls-legend-hint {
  font-size: 12px;
  color: var(--vp-c-text-1);
  opacity: 0.5;
  font-style: italic;
}

@media (min-width: 768px) {
  .ls-container {
    flex-direction: row;
  }

  .ls-canvas-wrapper {
    flex: 1;
    min-width: 0;
  }

  .ls-controls {
    width: 320px;
    flex-shrink: 0;
  }
}
</style>