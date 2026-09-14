export function WorldCard({ seed, climate, year, tempC }: { seed: string; climate: string; year: number; tempC: number }) {
  const label = climate.charAt(0).toUpperCase() + climate.slice(1);
  return (
    <aside className="world-card" aria-label="World summary">
      <div className="world-card-thumb" aria-hidden="true">
        <div className="world-card-globe" />
      </div>
      <div className="world-card-body">
        <strong>World {seed}</strong>
        <span className="world-card-climate">{label}</span>
        <span className="world-card-meta">Year {year.toLocaleString()}<i>|</i>{tempC}°C</span>
      </div>
    </aside>
  );
}
