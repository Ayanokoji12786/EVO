import type { Organism } from '../simulation/types';

function hsl(h: number, s: number, l: number, a = 1) { return `hsla(${(h + 360) % 360}, ${s}%, ${l}%, ${a})`; }

/** Genome-driven alien silhouette. Every visible part is tied to an existing heritable
 * trait, making lineages readable at a glance rather than merely palette-swapped. */
export function drawCreatureSprite(ctx: CanvasRenderingContext2D, sx: number, sy: number, height: number, heading: number, moving: boolean, phase: number, org: Organism, xrayGene: string | null = null, visualHue?: number) {
  const t = org.genome.traits;
  const size = Math.max(5, height);
  const bodyW = size * (0.62 + t.energyStorage * 0.12);
  const bodyL = size * (0.72 + t.maxSpeed * 0.12);
  const hue = visualHue ?? (t.colorHue || (org.speciesId * 137.5));
  const armor = Math.max(0, Math.min(1, (t.energyStorage - 0.6) / 1.2));
  const predator = Math.max(0, Math.min(1, (t.diet * .7 + t.aggression * .3)));
  const wings = Math.max(0, t.wingDevelopment ?? 0);
  const coldCover = Math.max(0, Math.min(1, (t.tempToleranceRange - .25) / 1.15));
  const highlight = (gene: string) => xrayGene === gene;
  const glow = (gene: string) => highlight(gene) ? '#ffffff' : null;

  ctx.save(); ctx.translate(sx, sy); ctx.rotate(heading); ctx.lineJoin = 'round';
  if (moving) ctx.translate(Math.sin(phase) * size * .04, 0);
  // The tail and legs sit behind the body, which gives even small organisms a readable
  // direction of travel and a proper animal-like stance rather than a generic dot.
  ctx.strokeStyle = glow('maxSpeed') ?? hsl(hue - 12, 48, 64, .92);
  ctx.lineWidth = Math.max(1, size * (.065 + t.maxSpeed * .016));
  ctx.beginPath();
  ctx.moveTo(-bodyL * .42, 0);
  ctx.quadraticCurveTo(-bodyL * (.7 + t.maxSpeed * .15), bodyW * .26 * Math.sin(phase), -bodyL * (.92 + t.maxSpeed * .18), bodyW * .08 * Math.cos(phase * .7));
  ctx.stroke();
  // Flight appendages / aquatic-style fins: wing-development controls span.
  if (wings > .08) {
    ctx.fillStyle = hsl(hue + 35, 72, 63, .7); ctx.strokeStyle = glow('wingDevelopment') ?? hsl(hue + 35, 60, 76, .8); ctx.lineWidth = highlight('wingDevelopment') ? 2.5 : 1;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-bodyL*.05, side*bodyW*.22); ctx.quadraticCurveTo(-bodyL*.15, side*bodyW*(1.6 + wings), bodyL*.4, side*bodyW*(1.15 + wings)); ctx.lineTo(bodyL*.15, side*bodyW*.18); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  // Streamlined body responds to speed; body scale responds to size.
  const bodyFill = ctx.createLinearGradient(-bodyL * .5, -bodyW * .42, bodyL * .62, bodyW * .52);
  bodyFill.addColorStop(0, hsl(hue - 12, 48 - t.camouflage * 20, 27 + coldCover * 10));
  bodyFill.addColorStop(.47, hsl(hue, 57 - t.camouflage * 25, 46 + coldCover * 10));
  bodyFill.addColorStop(1, hsl(hue + 13, 48, 30 + coldCover * 8));
  ctx.fillStyle = bodyFill;
  ctx.strokeStyle = glow('size') ?? hsl(hue, 60, 72, .92); ctx.lineWidth = highlight('size') ? 2.5 : 1;
  ctx.beginPath(); ctx.ellipse(0, 0, bodyL*.54, bodyW*.44, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Locomotion is visible in a four-legged stance. Fast organisms take longer strides;
  // winged species retain a lighter two-legged silhouette.
  if (wings < .72) {
    const legXs = wings > .3 ? [-.16, .22] : [-.28, .18];
    ctx.strokeStyle = glow('maxSpeed') ?? hsl(hue - 24, 38, 68, .86);
    ctx.lineWidth = Math.max(.85, size * .07);
    for (const legX of legXs) {
      for (const side of [-1, 1]) {
        const swing = moving ? Math.sin(phase * 1.8 + legX * 7 + side) * bodyL * (.12 + t.maxSpeed * .05) : 0;
        const hipX = legX * bodyL;
        const hipY = side * bodyW * .28;
        const kneeX = hipX - bodyL * .08 + swing;
        const kneeY = side * bodyW * (.62 + t.size * .06);
        const footX = kneeX + bodyL * (.12 + t.maxSpeed * .05) - swing;
        const footY = side * bodyW * (.84 + t.size * .06);
        ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();
      }
    }
  }
  // Thermal covering: spines/fur, denser with temperature tolerance.
  if (coldCover > .12) { ctx.strokeStyle = glow('tempToleranceRange') ?? hsl(hue + 20, 26, 82, .75); ctx.lineWidth = 1; for (let i=0;i<7;i++) { const a = (i/6-.5)*2.2; const x=Math.cos(a)*bodyL*.36; const y=Math.sin(a)*bodyW*.38; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x*1.2,y*(1.25+coldCover*.35)); ctx.stroke(); } }
  // Armor: segmented plates from energy-storage capacity.
  if (armor > .12) { ctx.strokeStyle = glow('energyStorage') ?? hsl(hue + 170, 42, 76, .82); ctx.lineWidth = highlight('energyStorage') ? 2.5 : 1; for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(i*bodyL*.2,0,bodyW*.33,Math.PI*.58,Math.PI*1.42);ctx.stroke();} }
  // Camouflage: high-frequency spots.
  if (t.camouflage > .08) { ctx.fillStyle = glow('camouflage') ?? hsl(hue + 85, 38, 26, .8); const count = Math.round(2 + t.camouflage*7); for(let i=0;i<count;i++){const a=i*2.4;ctx.beginPath();ctx.arc(Math.cos(a)*bodyL*.28,Math.sin(a)*bodyW*.23,Math.max(1,size*.045),0,Math.PI*2);ctx.fill();} }
  // Head, variable eye count and eye size make vision literal.
  const headX = bodyL*.5; const eyeScale = .07 + (t.visionRadius/260)*.14; const eyeCount = t.fieldOfView > 230 ? 3 : t.fieldOfView > 150 ? 2 : 1;
  ctx.fillStyle = hsl(hue + 15, 48, 55); ctx.beginPath(); ctx.ellipse(headX,0,bodyL*.2,bodyW*.3,0,0,Math.PI*2);ctx.fill();
  for(let i=0;i<eyeCount;i++){const y=(i-(eyeCount-1)/2)*bodyW*.22;ctx.fillStyle=glow('visionRadius') ?? '#e7fbff';ctx.beginPath();ctx.arc(headX+bodyL*.1,y,size*eyeScale,0,Math.PI*2);ctx.fill();ctx.fillStyle='#10131a';ctx.beginPath();ctx.arc(headX+bodyL*.11,y,size*eyeScale*.42,0,Math.PI*2);ctx.fill();}
  // Predation becomes visible jaw geometry.
  if(predator>.18){
    ctx.fillStyle=glow('diet') ?? hsl(8,78,65);
    ctx.beginPath();ctx.moveTo(headX+bodyL*.23,-bodyW*.13);ctx.lineTo(headX+bodyL*(.22+.2*predator),0);ctx.lineTo(headX+bodyL*.23,bodyW*.13);ctx.closePath();ctx.fill();
    if (predator > .46) {
      ctx.strokeStyle = glow('aggression') ?? hsl(16, 72, 72, .82); ctx.lineWidth = Math.max(.8, size * .045);
      for (let spine = 0; spine < 3; spine++) { const x = -bodyL * .1 + spine * bodyL * .19; ctx.beginPath(); ctx.moveTo(x, -bodyW * .36); ctx.lineTo(x - bodyL * .05, -bodyW * (.56 + predator * .2)); ctx.stroke(); }
    }
  }
  ctx.restore();
}

export function paletteFor() { return null; }
