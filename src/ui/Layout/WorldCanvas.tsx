import { useEffect, useRef, useState } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { screenToWorld } from '../../rendering/camera';
import { useSimStore } from '../../state/simStore';

type Impact = { before: number; after: number; eliminated: number; percent: number; extinctSpecies: number; survivors: number };

export function WorldCanvas({ controller, onGodInvoke, onMeteorImpact }: { controller: SimulationController; onGodInvoke?: (point: { x: number; y: number }) => void; onMeteorImpact?: (impact: Impact) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ dragging: boolean; moved: boolean; lastX: number; lastY: number }>({
    dragging: false,
    moved: false,
    lastX: 0,
    lastY: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const lastRainStroke = useRef(0);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const rainEquipped = useSimStore((s) => s.pendingGodAction?.kind === 'rainfall');

  const paintRain = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const action = useSimStore.getState().pendingGodAction;
    if (!action || action.kind !== 'rainfall') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const [x, y] = screenToWorld(controller.camera, event.clientX - rect.left, event.clientY - rect.top);
    controller.applyPendingGodAction(x, y);
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    controller.attachCanvas(canvasRef.current);
    const ro = new ResizeObserver(() => {
      if (containerRef.current) controller.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [controller]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: rainEquipped ? 'none' : isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={(e) => {
          if (rainEquipped && e.button === 0) { paintRain(e); lastRainStroke.current = performance.now(); return; }
          dragState.current = { dragging: true, moved: false, lastX: e.clientX, lastY: e.clientY };
          setIsDragging(true);
        }}
        onContextMenu={(e) => {
          if (!useSimStore.getState().godMode || !onGodInvoke) return;
          e.preventDefault();
          onGodInvoke({ x: e.clientX, y: e.clientY });
        }}
        onMouseMove={(e) => {
          if (rainEquipped) {
            setCursor({ x: e.clientX, y: e.clientY });
            if (e.buttons === 1 && performance.now() - lastRainStroke.current > 85) { paintRain(e); lastRainStroke.current = performance.now(); }
            return;
          }
          if (!dragState.current.dragging) { setCursor({ x: e.clientX, y: e.clientY }); return; }
          const dx = e.clientX - dragState.current.lastX;
          const dy = e.clientY - dragState.current.lastY;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragState.current.moved = true;
          controller.pan(dx, dy);
          dragState.current.lastX = e.clientX;
          dragState.current.lastY = e.clientY;
        }}
        onMouseUp={(e) => {
          const wasDrag = dragState.current.moved;
          dragState.current.dragging = false;
          setIsDragging(false);
          // Rain is applied on pointer-down and repeatedly while dragging. Do not apply
          // the generic click action again when the pointer is released.
          if (useSimStore.getState().pendingGodAction?.kind === 'rainfall') return;
          if (wasDrag) return;
          const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          if (useSimStore.getState().pendingGodAction) {
            const [wx, wy] = screenToWorld(controller.camera, sx, sy);
            const impact = controller.applyPendingGodAction(wx, wy);
            if (impact) onMeteorImpact?.(impact);
            return;
          }
          const org = controller.pickOrganismAt(sx, sy);
          controller.select(org ? org.id : null);
        }}
        onMouseLeave={() => {
          dragState.current.dragging = false;
          setIsDragging(false);
          setCursor(null);
        }}
        onWheel={(e) => {
          e.preventDefault();
          const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
          controller.zoom(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - rect.left, e.clientY - rect.top);
        }}
      />
      {rainEquipped && cursor && <div className="rain-brush-cursor" style={{ left: cursor.x, top: cursor.y }}><span>☁</span><i>✦</i></div>}
      {!rainEquipped && cursor && <PowerCursor controller={controller} point={cursor} />}
    </div>
  );
}

function PowerCursor({ controller, point }: { controller: SimulationController; point: { x: number; y: number } }) {
  const action = useSimStore((s) => s.pendingGodAction);
  if (!action) return <div className="power-cursor-label observe-cursor" style={{ left: point.x + 14, top: point.y + 14 }}>⌖ OBSERVE</div>;
  const labels: Record<string, string> = { meteor: '◎ IMPACT TARGET', terraform: '◯ TERRAIN BRUSH', placeCreature: '⌬ GENETIC INTERVENTION', mutate: '⌬ GENETIC INTERVENTION', introducePredator: '🐺 PREDATOR INTRODUCTION', lightning: '⚡ DIVINE STRIKE', flood: '🌊 FLOOD PLAIN', wildfire: '🔥 WILDFIRE', volcano: '🌋 VOLCANIC SEED' };
  const radius = 'radius' in action ? action.radius : action.kind === 'lightning' ? 16 : 38;
  const ringSize = Math.max(32, radius * controller.camera.zoom * 2);
  return <><div className={`power-cursor ${action.kind === 'meteor' ? 'meteor-cursor' : ''}`} style={{ left: point.x, top: point.y, width: ringSize, height: ringSize }} /> <div className="power-cursor-label" style={{ left: point.x + 18, top: point.y + 18 }}>{labels[action.kind] ?? '⌖ OBSERVE'}{action.kind === 'terraform' ? ` · ${Math.round(radius)} km` : ''}{action.kind === 'meteor' && <MeteorEstimate controller={controller} point={point} radius={radius} />}</div></>;
}

function MeteorEstimate({ controller, point, radius }: { controller: SimulationController; point: { x: number; y: number }; radius: number }) {
  const [wx, wy] = screenToWorld(controller.camera, point.x, point.y);
  const living = [...controller.world.organisms.values()].filter((org) => org.alive);
  const exposed = living.filter((org) => Math.hypot(org.x - wx, org.y - wy) <= radius).length;
  const expected = living.length ? (exposed / living.length) * 58 : 0;
  return <small>ESTIMATED BIOSPHERE LOSS: {Math.max(0, Math.round(expected * 0.8))}–{Math.min(100, Math.round(expected * 1.2))}%</small>;
}
