<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Page background: a faint, still dot grid that softly lights up and swells around the mouse
// pointer, gliding after it. Drawn on a <canvas> fixed behind everything. It only redraws while
// the glow is moving, so a still pointer costs nothing. Touch and keyboard users see the calm
// grid; "reduce motion" makes the glow snap to the pointer instead of gliding.
// Colour and strength come from --spotlight-* in main.css, so dark mode is defined there.

const GAP = 18 // px between dots
const DOT = 1 // resting dot radius, px
const REST = 0.18 // resting dot opacity, before strength (0.8 in light mode, so ~14%)
const RADIUS = 190 // how far the glow reaches, px
const GLIDE = 0.12 // share of the remaining distance the glow covers per 1/30 s

const canvas = ref<HTMLCanvasElement>()
let ctx: CanvasRenderingContext2D | null = null
let grid: HTMLCanvasElement | null = null // the still dots, drawn once and copied each frame
let width = 0
let height = 0
let rgb = '42 120 214'
let strength = 0.8

const target = { x: 0, y: 0, on: 0 } // where the pointer is; on = 1 while it's over the page
const glow = { x: 0, y: 0, on: 0 } // where the glow is drawn, easing towards target
let frame = 0
let last = 0

const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
const scheme = window.matchMedia('(prefers-color-scheme: dark)')

function readTokens() {
  const css = getComputedStyle(document.documentElement)
  rgb = css.getPropertyValue('--spotlight-rgb').trim() || rgb
  strength = parseFloat(css.getPropertyValue('--spotlight-strength')) || strength
}

function dot(c: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number) {
  c.fillStyle = `rgb(${rgb} / ${alpha})`
  c.beginPath()
  c.arc(x, y, r, 0, Math.PI * 2)
  c.fill()
}

// Size the canvas to the window (sharp on high-resolution screens) and redraw the still grid.
function setup() {
  if (!canvas.value) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = window.innerWidth
  height = window.innerHeight
  for (const c of [canvas.value, (grid ??= document.createElement('canvas'))]) {
    c.width = width * dpr
    c.height = height * dpr
  }
  ctx = canvas.value.getContext('2d')
  const g = grid.getContext('2d')
  if (!ctx || !g) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  for (let y = GAP / 2; y < height; y += GAP) for (let x = GAP / 2; x < width; x += GAP) dot(g, x, y, DOT, REST * strength)
  draw()
}

function draw() {
  // A window with no size yet (e.g. a tab opened in the background) has nothing to draw;
  // the resize listener draws it once it has a size.
  if (!ctx || !grid || !grid.width || !grid.height) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, grid.width, grid.height)
  ctx.drawImage(grid, 0, 0)
  const dpr = grid.width / width
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (glow.on < 0.01) return
  // Only the dots inside the glow are redrawn, larger and stronger towards its centre
  const first = (v: number) => Math.max(GAP / 2, Math.ceil((v - RADIUS - GAP / 2) / GAP) * GAP + GAP / 2)
  for (let y = first(glow.y); y <= glow.y + RADIUS && y < height; y += GAP) {
    for (let x = first(glow.x); x <= glow.x + RADIUS && x < width; x += GAP) {
      const d = Math.hypot(x - glow.x, y - glow.y)
      if (d >= RADIUS) continue
      const f = (1 - d / RADIUS) ** 2 * strength * glow.on
      dot(ctx, x, y, DOT + f * 1.3, f * 0.35)
    }
  }
}

// Ease the glow towards the pointer, one frame at a time, and stop once it has arrived.
function tick(now: number) {
  const steps = last ? Math.min((now - last) / (1000 / 30), 3) : 1 // same glide at any frame rate
  last = now
  const k = motion.matches ? 1 : 1 - (1 - GLIDE) ** steps
  glow.x += (target.x - glow.x) * k
  glow.y += (target.y - glow.y) * k
  glow.on += (target.on - glow.on) * k
  draw()
  const settled = Math.abs(target.x - glow.x) < 0.3 && Math.abs(target.y - glow.y) < 0.3 && Math.abs(target.on - glow.on) < 0.01
  if (settled) {
    frame = 0
    last = 0
  } else {
    frame = requestAnimationFrame(tick)
  }
}
function wake() {
  if (!frame) frame = requestAnimationFrame(tick)
}

function onMove(e: PointerEvent) {
  if (e.pointerType === 'touch') return
  if (glow.on < 0.01) {
    // Arriving on the page: fade in where the pointer is, rather than sliding in from elsewhere
    glow.x = e.clientX
    glow.y = e.clientY
  }
  target.x = e.clientX
  target.y = e.clientY
  target.on = 1
  wake()
}
function onLeave() {
  target.on = 0
  wake()
}
function onThemeChange() {
  readTokens()
  setup()
}

onMounted(() => {
  readTokens()
  setup()
  window.addEventListener('resize', setup)
  window.addEventListener('pointermove', onMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)
  scheme.addEventListener('change', onThemeChange)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('resize', setup)
  window.removeEventListener('pointermove', onMove)
  document.documentElement.removeEventListener('pointerleave', onLeave)
  scheme.removeEventListener('change', onThemeChange)
})
</script>

<template>
  <canvas ref="canvas" class="pointer-events-none fixed inset-0 -z-10 size-full" aria-hidden="true" />
</template>
