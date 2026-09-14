export type RailTool = 'world' | 'life' | 'evolution' | 'terrain' | 'weather' | 'tools' | 'analytics';

const ITEMS: { id: RailTool; icon: React.ReactNode; label: string }[] = [
  { id: 'world', icon: <GlobeIcon />, label: 'WORLD' },
  { id: 'life', icon: <PawIcon />, label: 'LIFE' },
  { id: 'evolution', icon: <HourglassIcon />, label: 'EVOLUTION' },
  { id: 'terrain', icon: <MountainIcon />, label: 'TERRAIN' },
  { id: 'weather', icon: <CloudIcon />, label: 'WEATHER' },
  { id: 'tools', icon: <FlaskIcon />, label: 'TOOLS' },
  { id: 'analytics', icon: <BarsIcon />, label: 'ANALYTICS' },
];

/** Reference-style vertical rail: seven labeled sections, matching the reference 1:1 —
 * a plain view switcher, not a toolbox of unrelated shortcuts. Life/Evolution/Terrain/
 * Weather enter God Mode focused on that category; World returns to the plain view;
 * Tools/Analytics open their own panels. */
export function SimulationRail({ activeTool, onSelectTool }: { activeTool: RailTool; onSelectTool: (tool: RailTool) => void }) {
  return (
    <aside className="sim-rail" aria-label="World tools">
      {ITEMS.map((item) => (
        <RailButton key={item.id} icon={item.icon} label={item.label} active={activeTool === item.id} onClick={() => onSelectTool(item.id)} />
      ))}
    </aside>
  );
}

function RailButton({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button className={`sim-rail-btn ${active ? 'is-active' : ''}`} onClick={onClick} title={label}>
      <span className="sim-rail-icon" aria-hidden="true">{icon}</span>
      <small>{label}</small>
    </button>
  );
}

// Inline SVG icons matching the reference rail — each stroked in currentColor so
// hover/active states flow through without per-icon override.
function GlobeIcon() { return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>; }
function PawIcon() { return <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><circle cx="6" cy="10" r="2" /><circle cx="10" cy="6" r="2" /><circle cx="14" cy="6" r="2" /><circle cx="18" cy="10" r="2" /><path d="M12 11c-3 0-6 3-6 6a3 3 0 0 0 3 3c1 0 2-.6 3-.6s2 .6 3 .6a3 3 0 0 0 3-3c0-3-3-6-6-6z" /></svg>; }
function HourglassIcon() { return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12M6 21h12M7 3c0 5 4 7 5 9-1 2-5 4-5 9M17 3c0 5-4 7-5 9 1 2 5 4 5 9" /></svg>; }
function MountainIcon() { return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M3 20l6-10 4 6 3-5 5 9z" /></svg>; }
function CloudIcon() { return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M7 17a4 4 0 0 1 0-8 5 5 0 0 1 10 0 3.5 3.5 0 0 1 0 7z" /></svg>; }
function FlaskIcon() { return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3h4M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" /></svg>; }
function BarsIcon() { return <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><rect x="4" y="12" width="3" height="8" /><rect x="10" y="7" width="3" height="13" /><rect x="16" y="4" width="3" height="16" /></svg>; }
