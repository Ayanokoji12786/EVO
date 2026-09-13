# Next.js interactive 3D hero reference

`InteractiveModelHero.tsx` is a standalone client component based on the composition
pattern in the supplied Three.js reference: an interactive model is rendered in a
background canvas while the information architecture and controls remain plain HTML.

It is intentionally an **example**, not a dependency of EVO's Vite/Canvas simulation.
That preserves the app's current build and avoids adding a second rendering stack just
for a decorative scene.

## Structure used by the example

1. `Canvas` is an absolute, full-bleed background sibling. `OrbitControls` owns direct
   manipulation, model loading is isolated behind `Suspense`, and lights/contact shadows
   give the asset physical depth.
2. A low-contrast readable scrim is a second visual layer; it separates text from the
   canvas without turning the model into wallpaper.
3. A normal HTML header and main element sit above both. They own the heading hierarchy,
   CTA, skip link, focus styles, responsive layout, and motion preference.
4. The WebGL canvas is deliberately enhancement-only (`aria-hidden`): losing WebGL or a
   model asset never removes navigation or a product action.

## Use it in a Next.js + Tailwind app

```bash
npm install three @react-three/fiber @react-three/drei
```

Copy `InteractiveModelHero.tsx` into a client-side component directory, put a `.glb` or
`.gltf` model in `public/models/`, then render it from a page or another client component:

```tsx
import { InteractiveModelHero } from '@/components/InteractiveModelHero'

export default function Home() {
  return <InteractiveModelHero modelUrl="/models/organism.glb" />
}
```

The model canvas is `aria-hidden` because it is visual enhancement only. The page title,
description, primary action, and motion toggle are native HTML controls with focus styles.
The canvas retains pointer orbit controls for people who can use them, without making the
core page inaccessible when WebGL, a model download, or motion is unavailable.
