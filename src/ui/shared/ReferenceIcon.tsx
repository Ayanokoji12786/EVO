export function ReferenceIcon({ kind, size = 24 }: { kind: string; size?: number }) {
  const shapes: Record<string, React.ReactNode> = {
    weather: <><path d="M7 15a4 4 0 0 1 0-8 5 5 0 0 1 10 0 3.5 3.5 0 0 1 0 7H7" /><path d="m8 18-1 3m6-3-1 3m6-3-1 3" /></>,
    life: <><path d="M20 3C10 3 4 9 4 17c0 2 1 3 3 3 8 0 13-7 13-17Z" /><path d="m4 21 14-15" /></>,
    evolution: <><path d="M6 2c0 10 12 10 12 20M18 2C18 12 6 12 6 22M7 4h10M8 8h8M8 16h8M7 20h10" /></>,
    destruction: <path d="M13 2c3 6-3 7 1 11 1-2 2-3 3-4 6 8 1 13-5 13S2 16 6 10c0 4 2 5 3 5-2-5 3-7 4-13Z" />,
    terraform: <><path d="m2 20 7-14 5 8 3-5 5 11H2Z" /><path d="m6 12 3 1 2-3m4 3 2 1 2-1" /></>,
    disease: <><circle cx="12" cy="12" r="3" /><path d="M8 8C2 8 2 2 7 2M16 8c6 0 6-6 1-6M8 16c-5 3-1 8 2 6m6-6c5 3 1 8-2 6M4 11c-4 4 0 8 4 5m12-5c4 4 0 8-4 5" /></>,
    predators: <><path d="m3 15 3-5 3-1 2-6 3 5 6 3 1 4-5-1-3 3-5-1-2 5H4l1-6Z" /><path d="m13 17 3 4m2-10h.1" /></>,
    laws: <><circle cx="12" cy="12" r="3" /><path d="m10 2 4 0 1 4 3 1 3 3-2 3 0 4-4 1-1 4h-4l-1-4-4-1-2-4 2-3-1-4 4-1 2-3Z" /></>,
    storm: <><path d="M6 14a4 4 0 0 1 0-8 5 5 0 0 1 10 0 4 4 0 0 1 1 8" /><path d="m12 10-4 7h4l-2 5 7-9h-5l2-3" /></>,
    snow: <><path d="M12 2v20M3 7l18 10M3 17 21 7M9 4l3 3 3-3M9 20l3-3 3 3" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
    analytics: <><path d="M3 20h18M5 16v-4m5 4V7m5 9v-6m5 6V3" /></>,
    experiment: <><path d="M9 3h6M10 3v7l-6 9c-1 2 0 3 2 3h12c2 0 3-1 2-3l-6-9V3M7 16h10" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[kind] ?? shapes.globe}</svg>;
}
