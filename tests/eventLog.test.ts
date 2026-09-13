import { describe, expect, it } from 'vitest';
import { EventLog } from '../src/history/eventLog';

describe('EventLog retention', () => {
  it('keeps a bounded chronological event window for long-running worlds', () => {
    const log = new EventLog();
    for (let i = 0; i < 3005; i++) log.add('natural', `event ${i}`, i, i);
    expect(log.all()).toHaveLength(3000);
    expect(log.all()[0].message).toBe('event 5');
    expect(log.all().at(-1)?.message).toBe('event 3004');
  });
});
