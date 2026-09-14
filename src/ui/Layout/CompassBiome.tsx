import type { SimulationController } from '../../state/simulationController';
import { useSimStore } from '../../state/simStore';

const FOOD_LABEL: Record<'scarce' | 'moderate' | 'abundant', string> = {
  scarce: 'Scarce Food',
  moderate: 'Moderate Food',
  abundant: 'Abundant Food',
};

/** Bottom-left compass rose + local biome readout, matching the reference HUD.
 * Temperature and humidity are derived from the world's live climate; the food label
 * bucketizes the actual live food-item count against carrying capacity so the reading
 * moves with the ecosystem instead of being a static badge. */
export function CompassBiome({ controller, tempC }: { controller: SimulationController; tempC: number }) {
  const stats = useSimStore((s) => s.stats);
  const humidity = Math.round(45 + controller.world.climate.rainfall * 22);
  const foodCount = controller.world.food.items.size;
  const foodBucket = foodCount > (stats?.population ?? 0) * 1.8 ? 'abundant' : foodCount > (stats?.population ?? 0) * 0.7 ? 'moderate' : 'scarce';

  return (
    <div className="compass-biome" aria-label="Biome readout">
      <div className="compass-rose" aria-hidden="true">
        <span className="compass-n">N</span>
        <span className="compass-e">E</span>
        <span className="compass-s">S</span>
        <span className="compass-w">W</span>
        <i className="compass-needle" />
      </div>
      <div className="compass-readout">
        <span>{tempC}°C</span><i>|</i>
        <span>{humidity}% Humidity</span><i>|</i>
        <span>{FOOD_LABEL[foodBucket]}</span>
      </div>
    </div>
  );
}
