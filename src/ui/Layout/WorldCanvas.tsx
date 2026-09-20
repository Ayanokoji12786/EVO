import { useEffect, useRef, useState } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { useSimStore } from '../../state/simStore';
import worldSpace from '../../assets/world-space.png';

type Impact = { before: number; after: number; eliminated: number; percent: number; extinctSpecies: number; survivors: number };

export function WorldCanvas({ controller, onMeteorImpact }: { controller: SimulationController; onMeteorImpact?: (impact: Impact) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ dragging: boolean; moved: boolean; lastX: number; lastY: number }>({
    dragging: false,
    moved: false,
    lastX: 0,
    lastY: 0,
  });
  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastRainStroke = useRef(0);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const rainEquipped = useSimStore((s) => s.pendingGodAction?.kind === 'rainfall');

  const paintRain = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const action = useSimStore.getState().pendingGodAction;
    if (!action || action.kind !== 'rainfall') return;
    const rect = canvas.getBoundingClientRect();
    const target = controller.targetTerrain(clientX - rect.left, clientY - rect.top);
    if (!target) return;
    const [x, y] = target;
    controller.applyPendingGodAction(x, y);
  };

  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') useSimStore.getState().setPendingGodAction(null);
    };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, []);

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
    <div ref={containerRef} className="world-canvas-stage" style={{ backgroundImage: `url(${worldSpace})` }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: rainEquipped ? 'none' : isDragging ? 'grabbing' : 'grab' }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (activePointers.current.size >= 2) {
            const [a, b] = [...activePointers.current.values()];
            pinchDistance.current = Math.hypot(b.x - a.x, b.y - a.y);
            dragState.current.dragging = false;
            dragState.current.moved = true;
            setIsDragging(false);
            return;
          }
          if (rainEquipped) { paintRain(e.currentTarget, e.clientX, e.clientY); lastRainStroke.current = performance.now(); return; }
          dragState.current = { dragging: true, moved: false, lastX: e.clientX, lastY: e.clientY };
          setIsDragging(true);
        }}
        onPointerMove={(e) => {
          if (activePointers.current.has(e.pointerId)) activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (activePointers.current.size >= 2) {
            const [a, b] = [...activePointers.current.values()];
            const distance = Math.hypot(b.x - a.x, b.y - a.y);
            const previous = pinchDistance.current;
            if (previous && distance > 0) {
              const rect = e.currentTarget.getBoundingClientRect();
              controller.zoom(distance / previous, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
            }
            pinchDistance.current = distance;
            return;
          }
          const rect = e.currentTarget.getBoundingClientRect();
          if (e.pointerType === 'mouse') setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          if (rainEquipped) {
            if (dragState.current.dragging || activePointers.current.has(e.pointerId)) {
              if (performance.now() - lastRainStroke.current > 85) { paintRain(e.currentTarget, e.clientX, e.clientY); lastRainStroke.current = performance.now(); }
            }
            return;
          }
          if (!dragState.current.dragging) return;
          const dx = e.clientX - dragState.current.lastX;
          const dy = e.clientY - dragState.current.lastY;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragState.current.moved = true;
          controller.pan(dx, dy);
          dragState.current.lastX = e.clientX;
          dragState.current.lastY = e.clientY;
        }}
        onPointerUp={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          const wasPinching = pinchDistance.current !== null || activePointers.current.size > 1;
          activePointers.current.delete(e.pointerId);
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
          if (activePointers.current.size < 2) pinchDistance.current = null;
          if (wasPinching) {
            const remaining = [...activePointers.current.values()][0];
            dragState.current = remaining
              ? { dragging: true, moved: true, lastX: remaining.x, lastY: remaining.y }
              : { dragging: false, moved: true, lastX: e.clientX, lastY: e.clientY };
            setIsDragging(Boolean(remaining));
            return;
          }
          const wasDrag = dragState.current.moved;
          dragState.current.dragging = false;
          setIsDragging(false);
          // Rain is applied on pointer-down and repeatedly while dragging. Do not apply
          // the generic click action again when the pointer is released.
          if (useSimStore.getState().pendingGodAction?.kind === 'rainfall') return;
          if (wasDrag) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          if (useSimStore.getState().pendingGodAction) {
            const target = controller.targetTerrain(sx, sy);
            if (!target) return;
            const [wx, wy] = target;
            const impact = controller.applyPendingGodAction(wx, wy);
            if (impact) onMeteorImpact?.(impact);
            return;
          }
          const org = controller.pickOrganismAt(sx, sy);
          controller.select(org ? org.id : null);
        }}
        onPointerCancel={(e) => {
          activePointers.current.delete(e.pointerId);
          pinchDistance.current = null;
          dragState.current.dragging = false;
          setIsDragging(false);
          if (e.pointerType === 'mouse') setCursor(null);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse' && !dragState.current.dragging) setCursor(null);
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
  if (!action) return null;
  const labels: Record<string, string> = { meteor: '◎ IMPACT TARGET', terraform: '◯ TERRAIN BRUSH', placeCreature: '⌬ GENETIC INTERVENTION', mutate: '⌬ GENETIC INTERVENTION', introducePredator: '🐺 PREDATOR INTRODUCTION', predatorPack: '🐺 PREDATOR SWARM (~20% OF POPULATION)', lightning: '⚡ DIVINE STRIKE', flood: '🌊 FLOOD PLAIN', wildfire: '🔥 WILDFIRE', volcano: '🌋 VOLCANIC SEED' };
  const radius = 'radius' in action ? action.radius : action.kind === 'lightning' ? 16 : 38;
  const ringSize = Math.max(32, radius * controller.camera.zoom * 2);
  return <><div className={`power-cursor ${action.kind === 'meteor' ? 'meteor-cursor' : ''}`} style={{ left: point.x, top: point.y, width: ringSize, height: ringSize }} /> <div className="power-cursor-label" style={{ left: point.x + 18, top: point.y + 18 }}>{labels[action.kind] ?? '⌖ OBSERVE'}{action.kind === 'terraform' ? ` · ${Math.round(radius)} km` : ''}{action.kind === 'meteor' && <MeteorEstimate controller={controller} point={point} radius={radius} />}</div></>;
}

function MeteorEstimate({ controller, point, radius }: { controller: SimulationController; point: { x: number; y: number }; radius: number }) {
  const target = controller.targetTerrain(point.x, point.y);
  if (!target) return <small>AIM AT THE WORLD</small>;
  const [wx, wy] = target;
  const living = [...controller.world.organisms.values()].filter((org) => org.alive);
  const exposed = living.filter((org) => Math.hypot(org.x - wx, org.y - wy) <= radius).length;
  const expected = living.length ? (exposed / living.length) * 58 : 0;
  return <small>ESTIMATED BIOSPHERE LOSS: {Math.max(0, Math.round(expected * 0.8))}–{Math.min(100, Math.round(expected * 1.2))}%</small>;
}
