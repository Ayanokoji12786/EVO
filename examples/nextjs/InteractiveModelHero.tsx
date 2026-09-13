'use client'

import { Clone, ContactShadows, OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'

type InteractiveModelHeroProps = {
  /** A public .glb or .gltf file, for example `/models/organism.glb`. */
  modelUrl: string
  title?: string
  description?: string
  primaryActionLabel?: string
  onPrimaryAction?: () => void
}

/**
 * A Next.js client component that keeps the 3D scene visually rich but semantically
 * optional. The Canvas is a decorative, directly manipulable background; all required
 * actions and information remain in normal HTML above it.
 *
 * Required packages:
 *   npm install three @react-three/fiber @react-three/drei
 */
export function InteractiveModelHero({
  modelUrl,
  title = 'A living system, observed in motion.',
  description = 'Rotate the specimen behind the interface, then enter the simulation when you are ready.',
  primaryActionLabel = 'Enter the simulation',
  onPrimaryAction,
}: InteractiveModelHeroProps) {
  const prefersReducedMotion = useReducedMotion()
  const [motionPausedByUser, setMotionPausedByUser] = useState(false)
  const ambientMotionEnabled = !prefersReducedMotion && !motionPausedByUser

  return (
    <section
      className="relative isolate min-h-[46rem] overflow-hidden bg-[#07100e] text-stone-50 sm:min-h-screen"
      aria-labelledby="interactive-model-title"
    >
      {/* This canvas is intentionally non-essential to screen-reader users. It remains
          pointer-interactive for sighted users, while the HTML layer contains the real UI. */}
      <div className="absolute inset-0" aria-hidden="true">
        <Canvas
          camera={{ fov: 33, position: [0, 0.4, 7] }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true }}
        >
          <color attach="background" args={['#07100e']} />
          <hemisphereLight args={['#d7f4e8', '#07100e', 1.25]} />
          <directionalLight castShadow intensity={2.1} position={[4, 5, 3]} shadow-mapSize={[1024, 1024]} />
          <pointLight color="#a3f7d8" intensity={12} position={[-3, 1, 2]} distance={10} />

          <Suspense fallback={null}>
            <Model modelUrl={modelUrl} />
          </Suspense>

          <ContactShadows opacity={0.34} blur={2.4} scale={12} position={[0, -2, 0]} far={5} />
          <OrbitControls
            autoRotate={ambientMotionEnabled}
            autoRotateSpeed={0.28}
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI / 2.8}
            maxPolarAngle={Math.PI / 1.65}
          />
        </Canvas>
      </div>

      {/* A low-contrast scrim preserves the model while making text consistently readable. */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(4,10,9,.92)_0%,rgba(4,10,9,.64)_42%,rgba(4,10,9,.12)_76%),linear-gradient(0deg,rgba(4,10,9,.8)_0%,transparent_42%)]"
        aria-hidden="true"
      />

      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[46rem] max-w-7xl flex-col px-5 py-5 sm:min-h-screen sm:px-8 sm:py-7 lg:px-12">
        <header className="pointer-events-auto flex items-center justify-between gap-4" aria-label="Primary navigation">
          <a href="#main-content" className="sr-only rounded bg-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-950 focus:not-sr-only">
            Skip to content
          </a>
          <a href="/" className="text-sm font-black tracking-[0.3em] text-emerald-100">
            EVO
          </a>
          <button
            type="button"
            className="rounded-full border border-white/15 bg-black/25 px-3 py-2 text-xs font-medium text-stone-200 shadow-[inset_0_1px_0_rgba(255,255,255,.16),0_6px_18px_rgba(0,0,0,.28)] backdrop-blur-md transition hover:border-emerald-100/50 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
            aria-pressed={ambientMotionEnabled}
            disabled={prefersReducedMotion}
            onClick={() => setMotionPausedByUser((paused) => !paused)}
          >
            {prefersReducedMotion
              ? 'Motion follows your device setting'
              : ambientMotionEnabled
                ? 'Pause ambient motion'
                : 'Resume ambient motion'}
          </button>
        </header>

        <main id="main-content" className="pointer-events-auto mt-auto max-w-xl pb-10 pt-24 sm:pb-16 lg:pb-24">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
            Interactive field study
          </p>
          <h1 id="interactive-model-title" className="max-w-lg text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-stone-50 sm:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-stone-200/85 sm:text-lg">
            {description}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onPrimaryAction}
              className="rounded-lg border border-emerald-100 bg-emerald-200 px-5 py-3 text-sm font-bold text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,.72),inset_0_-1px_0_rgba(7,84,62,.34),0_5px_16px_rgba(0,0,0,.3)] transition hover:-translate-y-0.5 hover:bg-emerald-100 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-100"
            >
              {primaryActionLabel}
            </button>
            <p className="text-xs leading-5 text-stone-300/70">
              Drag the background to inspect the model.
              <span className="block">The simulation controls remain fully keyboard accessible.</span>
            </p>
          </div>
        </main>
      </div>
    </section>
  )
}

function Model({ modelUrl }: { modelUrl: string }) {
  const { scene } = useGLTF(modelUrl)

  return (
    <group position={[1.65, -0.8, 0]} rotation={[0, -0.45, 0]} scale={1.55}>
      <Clone object={scene} castShadow receiveShadow />
    </group>
  )
}

function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(query.matches)
    updatePreference()
    query.addEventListener('change', updatePreference)
    return () => query.removeEventListener('change', updatePreference)
  }, [])

  return prefersReducedMotion
}
