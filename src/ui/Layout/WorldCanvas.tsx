import { useEffect, useRef } from 'react';
import type { SimulationController } from '../../state/simulationController';
import { screenToWorld } from '../../rendering/camera';
import { useSimStore } from '../../state/simStore';

export function WorldCanvas({ controller }: { controller: SimulationController }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ dragging: boolean; moved: boolean; lastX: number; lastY: number }>({
    dragging: false,
    moved: false,
    lastX: 0,
    lastY: 0,
  });

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
        style={{ width: '100%', height: '100%', display: 'block', cursor: dragState.current.dragging ? 'grabbing' : 'grab' }}
        onMouseDown={(e) => {
          dragState.current = { dragging: true, moved: false, lastX: e.clientX, lastY: e.clientY };
        }}
        onMouseMove={(e) => {
          if (!dragState.current.dragging) return;
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
          if (wasDrag) return;
          const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          if (useSimStore.getState().pendingGodAction) {
            const [wx, wy] = screenToWorld(controller.camera, sx, sy);
            controller.applyPendingGodAction(wx, wy);
            return;
          }
          const org = controller.pickOrganismAt(sx, sy);
          controller.select(org ? org.id : null);
        }}
        onMouseLeave={() => {
          dragState.current.dragging = false;
        }}
        onWheel={(e) => {
          e.preventDefault();
          const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
          controller.zoom(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - rect.left, e.clientY - rect.top);
        }}
      />
    </div>
  );
}
