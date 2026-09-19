import { useEffect, useRef } from 'react';
import type { SimulationController } from '../../state/simulationController';

/**
 * A live projected line between a selected organism and its inspector. The geometry is
 * updated directly on animation frames so camera drags and moving life stay fluid without
 * forcing the React HUD to re-render sixty times per second.
 */
export function SelectionTether({ controller, organismId }: { controller: SimulationController; organismId: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const backRef = useRef<SVGPathElement>(null);
  const nodeRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const svg = svgRef.current;
      const path = pathRef.current;
      const back = backRef.current;
      const node = nodeRef.current;
      const point = controller.organismScreenPoint(organismId);
      const panel = document.querySelector<HTMLElement>('.creature-inspector');
      if (!svg || !path || !back || !node || !point || !panel || window.innerWidth < 780) {
        if (svg) svg.style.opacity = '0';
        frame = requestAnimationFrame(update);
        return;
      }

      const panelRect = panel.getBoundingClientRect();
      const endX = panelRect.left + 2;
      const endY = Math.min(panelRect.bottom - 70, panelRect.top + 165);
      const span = Math.max(80, Math.abs(endX - point.x));
      const direction = endX >= point.x ? 1 : -1;
      const controlOneX = point.x + span * .44 * direction;
      const controlTwoX = endX - Math.min(96, span * .22) * direction;
      const d = `M ${point.x.toFixed(1)} ${point.y.toFixed(1)} C ${controlOneX.toFixed(1)} ${point.y.toFixed(1)}, ${controlTwoX.toFixed(1)} ${endY.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`;
      path.setAttribute('d', d);
      back.setAttribute('d', d);
      node.setAttribute('cx', point.x.toFixed(1));
      node.setAttribute('cy', point.y.toFixed(1));
      svg.style.opacity = '1';
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [controller, organismId]);

  return <svg ref={svgRef} className="selection-tether" aria-hidden="true">
    <defs>
      <linearGradient id="selection-tether-gradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#7bf1ff" stopOpacity=".92" />
        <stop offset=".65" stopColor="#57cfe9" stopOpacity=".52" />
        <stop offset="1" stopColor="#d8fbff" stopOpacity=".9" />
      </linearGradient>
    </defs>
    <path ref={backRef} className="selection-tether-path-back" />
    <path ref={pathRef} className="selection-tether-path" />
    <circle ref={nodeRef} className="selection-tether-node" r="2.4" />
  </svg>;
}
