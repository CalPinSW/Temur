import { computeNormalizedPosition, fallbackPosition } from '../boardGeometry';

describe('computeNormalizedPosition', () => {
  const container = { left: 100, top: 200, width: 300, height: 400 };

  it('normalizes a point inside the container to 0-1 coordinates', () => {
    const pos = computeNormalizedPosition({ x: 250, y: 400 }, container);
    expect(pos).toEqual({ x: 0.5, y: 0.5 });
  });

  it('maps the top-left corner to (0, 0)', () => {
    expect(computeNormalizedPosition({ x: 100, y: 200 }, container)).toEqual({ x: 0, y: 0 });
  });

  it('maps the bottom-right corner to (1, 1)', () => {
    expect(computeNormalizedPosition({ x: 400, y: 600 }, container)).toEqual({ x: 1, y: 1 });
  });

  it('clamps points outside the container on the low side to 0', () => {
    const pos = computeNormalizedPosition({ x: -50, y: -50 }, container);
    expect(pos).toEqual({ x: 0, y: 0 });
  });

  it('clamps points outside the container on the high side to 1', () => {
    const pos = computeNormalizedPosition({ x: 1000, y: 1000 }, container);
    expect(pos).toEqual({ x: 1, y: 1 });
  });

  it('falls back to the center for a zero-width container instead of dividing by zero', () => {
    const pos = computeNormalizedPosition(
      { x: 150, y: 250 },
      { left: 100, top: 200, width: 0, height: 400 }
    );
    expect(pos).toEqual({ x: 0.5, y: 0.5 });
  });

  it('falls back to the center for a zero-height container instead of dividing by zero', () => {
    const pos = computeNormalizedPosition(
      { x: 150, y: 250 },
      { left: 100, top: 200, width: 300, height: 0 }
    );
    expect(pos).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe('fallbackPosition', () => {
  it('places the first two players side by side on the first row', () => {
    expect(fallbackPosition(0)).toEqual({ x: 0.25, y: 0.15 });
    expect(fallbackPosition(1)).toEqual({ x: 0.75, y: 0.15 });
  });

  it('wraps to the next row after two columns', () => {
    expect(fallbackPosition(2)).toEqual({ x: 0.25, y: 0.39 });
    expect(fallbackPosition(3)).toEqual({ x: 0.75, y: 0.39 });
  });

  it('caps the row position so later players do not overflow the box', () => {
    const pos = fallbackPosition(20);
    expect(pos.y).toBe(0.9);
  });

  it('supports a custom column count', () => {
    expect(fallbackPosition(0, 3)).toEqual({ x: 1 / 6, y: 0.15 });
    expect(fallbackPosition(2, 3)).toEqual({ x: 5 / 6, y: 0.15 });
    expect(fallbackPosition(3, 3)).toEqual({ x: 1 / 6, y: 0.39 });
  });
});
