import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Group, Mesh } from 'three'
import {
  hideBannerAd,
  initializeAds,
  showBannerAd,
  showInterstitialAd,
} from './admob'
import './App.css'

type Face = 0 | 1 | 2 | 3
type Direction = 'out' | 'left' | 'right' | 'up' | 'down'
type BlockColor = 'blue' | 'purple' | 'orange' | 'green' | 'pink' | 'yellow'
type Block = {
  id: number
  face: Face
  layer: number
  slot: number
  direction: Direction
  color: BlockColor
  removed: boolean
}
type Cell = { face: Face; layer: number; slot: number }
type Mode = 'playing' | 'clear' | 'timeup' | 'collapsed'
type FlyEffect = { id: number; block: Block }
type HistoryEntry = {
  blocks: Block[]
  face: Face
  moves: number
  mistakes: number
  stability: number
}

declare global {
  interface Window {
    render_game_to_text?: () => string
    advanceTime?: (ms: number) => void
  }
}

const slots = 3
const colors: BlockColor[] = ['blue', 'purple', 'orange', 'green', 'pink', 'yellow']
const faceNames = ['Front', 'Right', 'Back', 'Left']
const blockColors: Record<BlockColor, string> = {
  blue: '#1fa4f2',
  purple: '#9246e8',
  orange: '#ff8b18',
  green: '#62c81d',
  pink: '#ed4598',
  yellow: '#ffd02c',
}

function seeded(level: number) {
  let seed = 0x9e3779b9 ^ (level * 2654435761)
  return () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return ((seed >>> 0) % 100000) / 100000
  }
}

function wrapFace(face: number): Face {
  return ((face + 4) % 4) as Face
}

function keyOf(cell: Cell) {
  return `${cell.face}:${cell.layer}:${cell.slot}`
}

function towerLayers(level: number) {
  return Math.min(7, 3 + Math.floor((level - 1) / 5))
}

function directionPool(level: number): Direction[] {
  if (level <= 2) return ['out']
  if (level <= 5) return ['out', 'left', 'right']
  if (level <= 15) return ['left', 'right', 'out', 'up']
  return ['left', 'right', 'up', 'down', 'out']
}

function generateBlocks(level: number): Block[] {
  const random = seeded(level)
  const layers = towerLayers(level)
  const directions = directionPool(level)
  const blocks: Block[] = []
  let id = 1

  for (let face = 0; face < 4; face += 1) {
    for (let layer = 0; layer < layers; layer += 1) {
      for (let slot = 0; slot < slots; slot += 1) {
        const tutorialCell = level <= 1 && face !== 0
        const density = Math.min(0.86, 0.46 + level * 0.035)
        const plannedGap = level > 2 && ((face + layer + slot + level) % 7 === 0)
        if (tutorialCell || plannedGap || random() > density) continue

        const direction = directions[Math.floor(random() * directions.length)]
        blocks.push({
          id: id++,
          face: face as Face,
          layer,
          slot,
          direction,
          color: colors[(face + layer + slot + level) % colors.length],
          removed: false,
        })
      }
    }
  }

  if (!blocks.some((block) => block.face === 0)) {
    blocks.push({ id, face: 0, layer: 0, slot: 1, direction: 'out', color: 'blue', removed: false })
  }

  if (!blocks.some((block) => canLaunch(blocks, block, layers))) {
    const first = blocks.find((block) => block.face === 0) ?? blocks[0]
    first.direction = 'out'
  }

  return blocks
}

function activeBlockAt(blocks: Block[], cell: Cell) {
  return blocks.find((block) => (
    !block.removed &&
    block.face === cell.face &&
    block.layer === cell.layer &&
    block.slot === cell.slot
  ))
}

function pathCells(block: Block, layers: number): Cell[] {
  const cells: Cell[] = []

  if (block.direction === 'up') {
    for (let layer = block.layer + 1; layer < layers; layer += 1) {
      cells.push({ face: block.face, layer, slot: block.slot })
    }
  }

  if (block.direction === 'down') {
    for (let layer = block.layer - 1; layer >= 0; layer -= 1) {
      cells.push({ face: block.face, layer, slot: block.slot })
    }
  }

  if (block.direction === 'left') {
    for (let slot = block.slot - 1; slot >= 0; slot -= 1) {
      cells.push({ face: block.face, layer: block.layer, slot })
    }
    cells.push({ face: wrapFace(block.face - 1), layer: block.layer, slot: slots - 1 })
  }

  if (block.direction === 'right') {
    for (let slot = block.slot + 1; slot < slots; slot += 1) {
      cells.push({ face: block.face, layer: block.layer, slot })
    }
    cells.push({ face: wrapFace(block.face + 1), layer: block.layer, slot: 0 })
  }

  return cells
}

function canLaunch(blocks: Block[], block: Block, layers: number) {
  if (block.removed) return false
  return pathCells(block, layers).every((cell) => !activeBlockAt(blocks, cell))
}

function remainingBlocks(blocks: Block[]) {
  return blocks.filter((block) => !block.removed).length
}

function firstLaunchable(blocks: Block[], layers: number) {
  return blocks.find((block) => canLaunch(blocks, block, layers)) ?? null
}

function cellPosition(cell: Cell): [number, number, number] {
  const radius = 1.52
  const offset = (cell.slot - 1) * 0.72
  const y = cell.layer * 0.42 + 0.22

  if (cell.face === 0) return [offset, y, radius]
  if (cell.face === 1) return [radius, y, -offset]
  if (cell.face === 2) return [-offset, y, -radius]
  return [-radius, y, offset]
}

function faceRotation(face: Face): [number, number, number] {
  if (face === 0) return [0, 0, 0]
  if (face === 1) return [0, Math.PI / 2, 0]
  if (face === 2) return [0, Math.PI, 0]
  return [0, -Math.PI / 2, 0]
}

function blockSize(face: Face): [number, number, number] {
  return face === 0 || face === 2 ? [0.62, 0.34, 0.48] : [0.48, 0.34, 0.62]
}

function faceNormal(face: Face): [number, number, number] {
  if (face === 0) return [0, 0, 1]
  if (face === 1) return [1, 0, 0]
  if (face === 2) return [0, 0, -1]
  return [-1, 0, 0]
}

function markPosition(block: Block, lift = 0.305): [number, number, number] {
  const position = cellPosition(block)
  const normal = faceNormal(block.face)
  return [
    position[0] + normal[0] * lift,
    position[1] + normal[1] * lift,
    position[2] + normal[2] * lift,
  ]
}

function directionAngle(direction: Direction) {
  if (direction === 'right') return -Math.PI / 2
  if (direction === 'down') return Math.PI
  if (direction === 'left') return Math.PI / 2
  return 0
}

function flyVector(block: Block): [number, number, number] {
  if (block.direction === 'up') return [0, 4.8, 0]
  if (block.direction === 'down') return [0, -3.2, 0]
  if (block.direction === 'left') {
    if (block.face === 0) return [-4.6, 0.2, 0]
    if (block.face === 1) return [0, 0.2, 4.6]
    if (block.face === 2) return [4.6, 0.2, 0]
    return [0, 0.2, -4.6]
  }
  if (block.direction === 'right') {
    if (block.face === 0) return [4.6, 0.2, 0]
    if (block.face === 1) return [0, 0.2, -4.6]
    if (block.face === 2) return [-4.6, 0.2, 0]
    return [0, 0.2, 4.6]
  }
  if (block.face === 0) return [0, 0.2, 5.4]
  if (block.face === 1) return [5.4, 0.2, 0]
  if (block.face === 2) return [0, 0.2, -5.4]
  return [-5.4, 0.2, 0]
}

function normalizeAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

function ArrowShape({ color, z }: { color: string; z: number }) {
  return (
    <group>
      <mesh position={[0, -0.05, z]}>
        <planeGeometry args={[0.12, 0.36]} />
        <meshBasicMaterial color={color} transparent opacity={color === '#1a4f8f' ? 0.42 : 1} />
      </mesh>
      <mesh position={[0, 0.22, z]} rotation={[0, 0, Math.PI / 2]}>
        <circleGeometry args={[0.19, 3]} />
        <meshBasicMaterial color={color} transparent opacity={color === '#1a4f8f' ? 0.42 : 1} />
      </mesh>
    </group>
  )
}

function DirectionMark({ direction }: { direction: Direction }) {
  if (direction === 'out') {
    return (
      <group>
        <mesh position={[0.02, -0.02, -0.006]}>
          <circleGeometry args={[0.205, 40]} />
          <meshBasicMaterial color="#1a4f8f" transparent opacity={0.38} />
        </mesh>
        <mesh position={[0, 0, -0.003]}>
          <circleGeometry args={[0.205, 40]} />
          <meshBasicMaterial color="#fff8ef" />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <ringGeometry args={[0.084, 0.132, 36]} />
          <meshBasicMaterial color="#1a4f8f" />
        </mesh>
        <mesh position={[0, 0, 0.004]}>
          <circleGeometry args={[0.035, 24]} />
          <meshBasicMaterial color="#1a4f8f" />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <planeGeometry args={[0.042, 0.14]} />
          <meshBasicMaterial color="#fff8ef" />
        </mesh>
        <mesh position={[0, -0.24, 0]}>
          <planeGeometry args={[0.042, 0.14]} />
          <meshBasicMaterial color="#fff8ef" />
        </mesh>
        <mesh position={[0.24, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[0.042, 0.14]} />
          <meshBasicMaterial color="#fff8ef" />
        </mesh>
        <mesh position={[-0.24, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[0.042, 0.14]} />
          <meshBasicMaterial color="#fff8ef" />
        </mesh>
      </group>
    )
  }

  return (
    <group rotation={[0, 0, directionAngle(direction)]}>
      <ArrowShape color="#1a4f8f" z={-0.004} />
      <ArrowShape color="#fff8ef" z={0} />
    </group>
  )
}

function BlockMark({ block }: { block: Block }) {
  return (
    <group position={markPosition(block)} rotation={faceRotation(block.face)}>
      <DirectionMark direction={block.direction} />
    </group>
  )
}

function TowerBlock({
  block,
  active,
  hinted,
  blocked,
  previewed,
  onPreview,
  onClearPreview,
  onClick,
}: {
  block: Block
  active: boolean
  hinted: boolean
  blocked: boolean
  previewed: boolean
  onPreview: (id: number) => void
  onClearPreview: () => void
  onClick: (id: number) => void
}) {
  const meshRef = useRef<Mesh>(null)
  const position = cellPosition(block)
  const rotation = faceRotation(block.face)
  const color = blockColors[block.color]

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const pulse = hinted || previewed ? Math.sin(clock.elapsedTime * 6) * 0.035 + 0.045 : 0
    const shake = blocked ? Math.sin(clock.elapsedTime * 34) * 0.05 : 0
    meshRef.current.position.set(position[0] + shake, position[1] + pulse, position[2])
  })

  if (block.removed) return null

  return (
    <group>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        position={position}
        rotation={rotation}
        onPointerDown={(event) => {
          if (!active) return
          event.stopPropagation()
          onPreview(block.id)
        }}
        onPointerOver={(event) => {
          if (!active) return
          event.stopPropagation()
          onPreview(block.id)
        }}
        onPointerOut={() => onClearPreview()}
        onClick={(event) => {
          if (!active) return
          event.stopPropagation()
          onClick(block.id)
        }}
      >
        <boxGeometry args={blockSize(block.face)} />
        <meshStandardMaterial
          color={color}
          roughness={0.38}
          metalness={0.02}
          transparent={!active}
          opacity={active ? 1 : 0.62}
          emissive={hinted || previewed ? '#534100' : '#000000'}
          emissiveIntensity={hinted || previewed ? 0.45 : 0}
        />
      </mesh>
      <BlockMark block={block} />
    </group>
  )
}

function PathPreview({ cells, valid }: { cells: Cell[]; valid: boolean }) {
  const color = valid ? '#72ff9f' : '#ff4b5f'
  return (
    <group>
      {cells.map((cell, index) => {
        const position = cellPosition(cell)
        return (
          <mesh key={`${keyOf(cell)}:${index}`} position={[position[0], position[1] + 0.28, position[2]]}>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} />
          </mesh>
        )
      })}
    </group>
  )
}

function FlyBlock({ effect, onDone }: { effect: FlyEffect; onDone: (id: number) => void }) {
  const groupRef = useRef<Group>(null)
  const startedAt = useRef<number | null>(null)
  const start = useMemo(() => cellPosition(effect.block), [effect.block])
  const end = useMemo(() => flyVector(effect.block), [effect.block])
  const rotation = faceRotation(effect.block.face)

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    if (startedAt.current == null) startedAt.current = clock.elapsedTime
    const t = Math.min(1, (clock.elapsedTime - startedAt.current) / 0.55)
    const ease = 1 - Math.pow(1 - t, 3)
    groupRef.current.position.set(
      start[0] + end[0] * ease,
      start[1] + end[1] * ease + Math.sin(t * Math.PI) * 0.4,
      start[2] + end[2] * ease,
    )
    groupRef.current.rotation.y = rotation[1] + t * Math.PI * 2.3
    groupRef.current.scale.setScalar(1 - t * 0.24)
    if (t >= 1) onDone(effect.id)
  })

  return (
    <group ref={groupRef} position={start} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={blockSize(effect.block.face)} />
        <meshStandardMaterial color={blockColors[effect.block.color]} roughness={0.34} />
      </mesh>
      <group position={[0, 0, 0.305]}>
        <DirectionMark direction={effect.block.direction} />
      </group>
    </group>
  )
}

function TowerScene({
  blocks,
  layers,
  activeFace,
  hintId,
  blockedId,
  previewId,
  flyouts,
  stability,
  onPreview,
  onClearPreview,
  onBlockClick,
  onFlyDone,
}: {
  blocks: Block[]
  layers: number
  activeFace: Face
  hintId: number | null
  blockedId: number | null
  previewId: number | null
  flyouts: FlyEffect[]
  stability: number
  onPreview: (id: number) => void
  onClearPreview: () => void
  onBlockClick: (id: number) => void
  onFlyDone: (id: number) => void
}) {
  const towerRef = useRef<Group>(null)
  const lean = (100 - stability) / 100
  const previewBlock = previewId == null ? null : blocks.find((block) => block.id === previewId && !block.removed) ?? null
  const previewCells = previewBlock ? pathCells(previewBlock, layers) : []
  const previewValid = previewBlock ? canLaunch(blocks, previewBlock, layers) : false

  useFrame(({ clock }) => {
    if (!towerRef.current) return
    const target = -activeFace * Math.PI / 2
    towerRef.current.rotation.y += normalizeAngle(target - towerRef.current.rotation.y) * 0.16
    towerRef.current.rotation.z = Math.sin(clock.elapsedTime * 2.3) * lean * 0.04
  })

  return (
    <>
      <CameraRig layers={layers} />
      <color attach="background" args={['#67ddff']} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[3.8, 7.5, 5.5]} intensity={2.35} castShadow />
      <mesh receiveShadow position={[0, -0.14, 0]}>
        <cylinderGeometry args={[2.55, 2.75, 0.26, 48]} />
        <meshStandardMaterial color="#f0c985" roughness={0.48} />
      </mesh>
      <group ref={towerRef} position={[0, 0.28, 0]}>
        <mesh receiveShadow position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.88, 1.42, 4]} />
          <meshStandardMaterial color="#24324f" roughness={0.72} transparent opacity={0.42} />
        </mesh>
        <mesh receiveShadow position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.04, 40]} />
          <meshStandardMaterial color="#10192d" roughness={0.82} transparent opacity={0.18} />
        </mesh>
        {blocks.map((block) => (
          <TowerBlock
            key={block.id}
            block={block}
            active={block.face === activeFace}
            hinted={hintId === block.id}
            blocked={blockedId === block.id}
            previewed={previewId === block.id}
            onPreview={onPreview}
            onClearPreview={onClearPreview}
            onClick={onBlockClick}
          />
        ))}
        {previewBlock && <PathPreview cells={previewCells} valid={previewValid} />}
        {flyouts.map((effect) => (
          <FlyBlock key={effect.id} effect={effect} onDone={onFlyDone} />
        ))}
      </group>
    </>
  )
}

function CameraRig({ layers }: { layers: number }) {
  const { camera: sceneCamera, size } = useThree()
  const cameraRef = useRef(sceneCamera)

  useEffect(() => {
    cameraRef.current = sceneCamera
  }, [sceneCamera])

  useEffect(() => {
    const camera = cameraRef.current
    camera.position.set(0, 3.2 + layers * 0.2, 6.8)
    camera.lookAt(0, 1.45, 0)
    if ('zoom' in camera) {
      camera.zoom = Math.min(size.width / 3.95, size.height / 4.85, 138)
      camera.updateProjectionMatrix()
    }
  }, [layers, size.height, size.width])

  return null
}

function App() {
  const [level, setLevel] = useState(1)
  const [coins, setCoins] = useState(250)
  const [moves, setMoves] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [combo, setCombo] = useState(0)
  const [timer, setTimer] = useState(90)
  const [mode, setMode] = useState<Mode>('playing')
  const [blocks, setBlocks] = useState(() => generateBlocks(1))
  const [activeFace, setActiveFace] = useState<Face>(0)
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([])
  const [hintId, setHintId] = useState<number | null>(null)
  const [blockedId, setBlockedId] = useState<number | null>(null)
  const [previewId, setPreviewId] = useState<number | null>(null)
  const [status, setStatus] = useState('Swipe, spot, launch.')
  const [adStatus, setAdStatus] = useState('Initializing AdMob test mode...')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [stability, setStability] = useState(100)
  const [flyouts, setFlyouts] = useState<FlyEffect[]>([])
  const nextEffectId = useRef(1000)
  const dragStartX = useRef<number | null>(null)
  const dragStartY = useRef<number | null>(null)
  const layers = towerLayers(level)
  const timerLimit = level < 6 ? 90 : Math.max(50, 95 - Math.floor(level / 4) * 4)

  useEffect(() => {
    initializeAds()
      .then(setAdStatus)
      .catch((error: unknown) => setAdStatus(`AdMob init failed: ${String(error)}`))
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setTimer((value) => {
        if (mode !== 'playing' || level < 6) return value
        const next = Math.max(0, value - 1)
        if (next === 0) {
          setMode('timeup')
          setStatus('Time is up.')
        }
        return next
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [level, mode])

  useEffect(() => {
    window.render_game_to_text = () => JSON.stringify({
      coordinateSystem: '4-face tower; faces: 0 front, 1 right, 2 back, 3 left',
      mode,
      level,
      activeFace,
      activeFaceName: faceNames[activeFace],
      coins,
      moves,
      mistakes,
      combo,
      timer,
      remainingBlocks: remainingBlocks(blocks),
      hintId,
      blockedId,
      previewId,
      stability,
      status,
      blocks: blocks.map((block) => ({
        id: block.id,
        face: block.face,
        layer: block.layer,
        slot: block.slot,
        direction: block.direction,
        removed: block.removed,
        launchable: canLaunch(blocks, block, layers),
      })),
    })
    window.advanceTime = (ms: number) => setTimer((value) => Math.max(0, value - ms / 1000))
    return () => {
      delete window.render_game_to_text
      delete window.advanceTime
    }
  }, [activeFace, blockedId, blocks, coins, combo, hintId, layers, level, mistakes, mode, moves, previewId, stability, status, timer])

  function resetLevel(nextLevel = level, nextCoins = coins) {
    const nextTimer = nextLevel < 6 ? 90 : Math.max(50, 95 - Math.floor(nextLevel / 4) * 4)
    setLevel(nextLevel)
    setCoins(nextCoins)
    setMoves(0)
    setMistakes(0)
    setCombo(0)
    setTimer(nextTimer)
    setBlocks(generateBlocks(nextLevel))
    setActiveFace(0)
    setUndoStack([])
    setHintId(null)
    setBlockedId(null)
    setPreviewId(null)
    setStability(100)
    setMode('playing')
    setDrawerOpen(false)
    setFlyouts([])
    setStatus(nextLevel <= 2 ? 'Swipe to rotate. Tap the target marks.' : 'Rotate to find the open path.')
  }

  function nextLevel() {
    if (level > 0 && level % 10 === 0) {
      void showInterstitialAd()
        .then(() => setAdStatus('Interstitial requested at level break.'))
        .catch((error) => setAdStatus(`Interstitial failed: ${String(error)}`))
    }
    resetLevel(level + 1, coins + 30 + level + combo * 2)
  }

  function rotate(delta: 1 | -1) {
    if (mode !== 'playing') return
    setActiveFace((face) => wrapFace(face + delta))
    setPreviewId(null)
    setHintId(null)
    setStatus('Check the new face for an open path.')
  }

  function tryBlock(id: number) {
    if (mode !== 'playing') return
    const block = blocks.find((item) => item.id === id)
    if (!block || block.removed || block.face !== activeFace) return

    if (canLaunch(blocks, block, layers)) {
      const left = remainingBlocks(blocks) - 1
      setUndoStack((stack) => [...stack, {
        blocks: blocks.map((item) => ({ ...item })),
        face: activeFace,
        moves,
        mistakes,
        stability,
      }])
      setBlocks((current) => current.map((item) => (item.id === id ? { ...item, removed: true } : item)))
      setFlyouts((items) => [...items, { id: nextEffectId.current++, block }])
      setMoves((value) => value + 1)
      setCombo((value) => value + 1)
      setCoins((value) => value + 1)
      setHintId(null)
      setBlockedId(null)
      setPreviewId(null)
      setStatus(left === 0 ? 'Tower cleared.' : `Good launch. ${left} blocks left.`)
      if (left === 0) window.setTimeout(() => setMode('clear'), 480)
      return
    }

    setMistakes((value) => value + 1)
    setCombo(0)
    setBlockedId(id)
    setPreviewId(id)
    setStability((value) => {
      const next = Math.max(0, value - (level < 6 ? 5 : 11))
      if (next === 0) {
        setMode('collapsed')
        setStatus('Tower collapsed.')
      } else {
        setStatus('Blocked. The red path shows what is in the way.')
      }
      return next
    })
    window.setTimeout(() => {
      setBlockedId(null)
      setPreviewId(null)
    }, 700)
  }

  function undo() {
    const previous = undoStack[undoStack.length - 1]
    if (!previous) {
      setStatus('Nothing to undo.')
      return
    }
    setBlocks(previous.blocks)
    setActiveFace(previous.face)
    setMoves(previous.moves)
    setMistakes(previous.mistakes)
    setStability(previous.stability)
    setCombo(0)
    setUndoStack((stack) => stack.slice(0, -1))
    setHintId(null)
    setPreviewId(null)
    setStatus('Undo restored the previous tower.')
  }

  function hint() {
    const block = firstLaunchable(blocks, layers)
    if (!block) {
      setStatus('No open path found.')
      return
    }
    setActiveFace(block.face)
    setHintId(block.id)
    setPreviewId(block.id)
    setStatus(block.face === activeFace ? 'Highlighted a good launch.' : 'Rotated toward a good launch.')
  }

  function onShellPointerDown(event: ReactPointerEvent<HTMLElement>) {
    dragStartX.current = event.clientX
    dragStartY.current = event.clientY
  }

  function onShellPointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (dragStartX.current == null || dragStartY.current == null) return
    const dx = event.clientX - dragStartX.current
    const dy = event.clientY - dragStartY.current
    dragStartX.current = null
    dragStartY.current = null
    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.25) return
    rotate(dx < 0 ? 1 : -1)
  }

  return (
    <main className="game-shell" onPointerDown={onShellPointerDown} onPointerUp={onShellPointerUp}>
      <Canvas shadows orthographic camera={{ position: [0, 4.8, 7.2], zoom: 70, near: 0.1, far: 100 }}>
        <TowerScene
          blocks={blocks}
          layers={layers}
          activeFace={activeFace}
          hintId={hintId}
          blockedId={blockedId}
          previewId={previewId}
          flyouts={flyouts}
          stability={stability}
          onPreview={setPreviewId}
          onClearPreview={() => setPreviewId(null)}
          onBlockClick={tryBlock}
          onFlyDone={(id) => setFlyouts((items) => items.filter((item) => item.id !== id))}
        />
      </Canvas>

      <section className="hud top-hud">
        <button className="square-button" onClick={() => setDrawerOpen(true)}>⚙</button>
        <div className="level-card">
          <strong>Level {level}</strong>
          <span><i style={{ width: `${Math.max(0, Math.min(100, (timer / timerLimit) * 100))}%` }} /></span>
        </div>
        <div className="coin-card"><b>★</b>{coins}</div>
      </section>

      <button className="rotate-button rotate-left" onClick={() => rotate(-1)} aria-label="Rotate left">‹</button>
      <button className="rotate-button rotate-right" onClick={() => rotate(1)} aria-label="Rotate right">›</button>

      <div className="face-badge">{faceNames[activeFace]}</div>
      <div className="status-chip">{status}</div>
      <div className="stability-chip">Steady {stability}% · x{combo}</div>

      <section className="bottom-actions">
        <button onClick={undo}><span>↶</span>Undo</button>
        <button className="primary" onClick={hint}><span>✦</span>Hint</button>
        <button onClick={nextLevel}><span>▶</span>Skip</button>
      </section>

      {drawerOpen && (
        <section className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="drawer" onClick={(event) => event.stopPropagation()}>
            <button className="drawer-close" onClick={() => setDrawerOpen(false)}>Close</button>
            <h2>Options</h2>
            <p>{adStatus}</p>
            <button onClick={() => resetLevel()}>Restart Level</button>
            <div className="drawer-grid">
              <button onClick={() => void showBannerAd().then(() => setAdStatus('Bottom banner requested.'))}>Show Banner</button>
              <button onClick={() => void hideBannerAd().then(() => setAdStatus('Banner hidden.'))}>Hide Banner</button>
            </div>
            <button onClick={() => void showInterstitialAd().then(() => setAdStatus('Interstitial requested.'))}>Test Interstitial</button>
          </div>
        </section>
      )}

      {mode === 'clear' && (
        <section className="result-modal">
          <div>
            <h1>Excellent!</h1>
            <div className="stars">★ ★ ★</div>
            <p>+{30 + level + combo * 2} Coins</p>
            <button onClick={nextLevel}>Next Level</button>
          </div>
        </section>
      )}

      {(mode === 'timeup' || mode === 'collapsed') && (
        <section className="result-modal">
          <div>
            <h1>{mode === 'timeup' ? 'Time Up' : 'Collapsed'}</h1>
            <p>{mode === 'timeup' ? 'Try again or add extra time.' : 'Too many blocked launches shook the tower.'}</p>
            <button onClick={() => { setTimer(30); setMode('playing') }}>+30 sec</button>
            <button onClick={() => resetLevel()}>Restart</button>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
