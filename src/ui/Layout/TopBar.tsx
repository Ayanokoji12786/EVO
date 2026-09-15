import { useState, useRef, useEffect } from 'react';
import { useSimStore, type SpeedSetting } from '../../state/simStore';
import { ReferenceIcon } from '../shared/ReferenceIcon';
import { normalizedShannonDiversity } from '../../statistics/stats';
import './ReferenceHud.css';

const SPEEDS: SpeedSetting[] = [1, 5, 10, 'max'];

export function TopBar({
  onOpenTree,
  onOpenTimeMachine,
  onOpenExperiment,
  onOpenAbout,
  onOpenCinematic,
  onOpenInsights,
  onExit,
}: {
  onOpenTree: () => void;
  onOpenTimeMachine: () => void;
  onOpenExperiment: () => void;
  onOpenAbout: () => void;
  onOpenCinematic: () => void;
  onOpenInsights: () => void;
  onExit: () => void;
}) {
  const speed = useSimStore((s) => s.speed);
  const paused = useSimStore((s) => s.paused);
  const stats = useSimStore((s) => s.stats);
  const species = useSimStore((s) => s.species);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const setPaused = useSimStore((s) => s.setPaused);
  const evolutionVision = useSimStore((s) => s.evolutionVision);
  const setEvolutionVision = useSimStore((s) => s.setEvolutionVision);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  const biodiversity = normalizedShannonDiversity(species.filter((s)=>s.extinctTick===null).map((s)=>s.population)).toFixed(2);

  return (
    <header className="sim-topbar">
      <div className="sim-brand-block">
        <strong>EVO</strong>
        <span>LIFE IN MOTION</span>
      </div>

      <div className="sim-vitals" aria-label="Current world vitals">
        <Readout icon={<LeafIcon />} label="Generation" value={(stats?.generation ?? 0).toLocaleString()} />
        <Readout icon={<PopulationIcon />} label="Population" value={(stats?.population ?? 0).toLocaleString()} />
        <Readout icon={<DnaIcon />} label="Species" value={stats?.speciesCount ?? 0} />
        <Readout icon={<PulseIcon />} label="Biodiversity" value={biodiversity} />
      </div>

      <div className="sim-topbar-spacer" />

      <div className="sim-time-controls" aria-label="Simulation speed">
        <button className={`sim-time-btn sim-time-btn-icon ${paused ? 'active' : ''}`} onClick={() => setPaused(!paused)} title="Pause / Play" aria-label={paused ? 'Play' : 'Pause'}>
          {paused ? '▶' : '❚❚'}
        </button>
        {SPEEDS.map((s) => (
          <button
            key={s}
            className={`sim-time-btn ${!paused && speed === s ? 'active' : ''}`}
            onClick={() => { setSpeed(s); setPaused(false); }}
            title={s==='max' ? 'Maximum speed · limited by your device' : `${s}× simulation speed`}
          >
            {s === 'max' ? 'MAX' : `${s}×`}
          </button>
        ))}
      </div>

      <button className={`sim-icon-btn ${evolutionVision ? 'active' : ''}`} onClick={() => setEvolutionVision(!evolutionVision)} title="Evolution Vision" aria-label="Toggle Evolution Vision">
        <SunIcon />
      </button>

      <div ref={menuRef} className="sim-overflow-menu">
        <button className={`sim-icon-btn ${menuOpen ? 'active' : ''}`} onClick={() => setMenuOpen((v) => !v)} title="Settings & more views" aria-label="Settings and more views">
          <GearIcon />
        </button>
        {menuOpen && (
          <div className="sim-overflow-panel hud-panel">
            <MenuItem icon="evolution" label="Tree of Life" onClick={() => { onOpenTree(); setMenuOpen(false); }} />
            <MenuItem icon="analytics" label="Time Machine" onClick={() => { onOpenTimeMachine(); setMenuOpen(false); }} />
            <MenuItem icon="experiment" label="Multiverse Experiments" onClick={() => { onOpenExperiment(); setMenuOpen(false); }} />
            <MenuItem icon="globe" label="Evolution Replay" onClick={() => { onOpenCinematic(); setMenuOpen(false); }} />
            <MenuItem icon="life" label="Ask the Universe" onClick={() => { onOpenInsights(); setMenuOpen(false); }} />
            <MenuItem icon="laws" label="About the Simulation" onClick={() => { onOpenAbout(); setMenuOpen(false); }} />
            <div className="sim-overflow-sep" />
            <MenuItem icon="✕" label="Exit World" onClick={onExit} danger />
          </div>
        )}
      </div>
    </header>
  );
}

function Readout({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="readout">
      <span className="readout-icon" aria-hidden="true">{icon}</span>
      <div className="readout-body">
        <div className="readout-label">{label}</div>
        <div className="readout-value">{value}</div>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button className={`menu-item ${danger ? 'danger' : ''}`} onClick={onClick}>
      <span>{icon==='✕' ? '×' : <ReferenceIcon kind={icon} size={17} />}</span><span>{label}</span>
    </button>
  );
}

// Compact inline SVG icons — sharp at any DPR, follow currentColor, and read as chips
// beside their numeric readouts instead of the emoji glyphs which vary by platform.
function LeafIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 4c-9 0-16 6-16 14 0 1.1.4 2 1 2 8 0 15-7 15-16z" /><path d="M4 20c4-4 8-6 15-15" /></svg>;
}
function PopulationIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M14 20c0-2 2-4 4.5-4s3.5 1.4 3.5 4" /></svg>;
}
function DnaIcon() {
  return <ReferenceIcon kind="evolution" size={22} />;
}
function PulseIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2-6 3 12 3-8 2 4h4" /></svg>;
}
function SunIcon() {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" /></svg>;
}
function GearIcon() {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V19.6a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H2.4a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H8.5a1.7 1.7 0 0 0 1-1.55V2.4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V8.5a1.7 1.7 0 0 0 1.55 1H21.6a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" /></svg>;
}
