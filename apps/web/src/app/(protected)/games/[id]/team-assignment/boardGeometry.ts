import { type BoardPosition } from '@temur/shared';

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// Converts an absolute drop point into a position normalized (0-1) within
// the target container, clamped so a drop near the edge never lands
// outside the box. Mirrors mobile's TeamAssignmentBoard.handleDragRelease.
export function computeNormalizedPosition(point: Point, container: Rect): BoardPosition {
  if (container.width === 0 || container.height === 0) {
    return { x: 0.5, y: 0.5 };
  }
  return {
    x: clamp01((point.x - container.left) / container.width),
    y: clamp01((point.y - container.top) / container.height),
  };
}

// Grid layout used for players that don't yet have a saved board position
// (freshly assigned, or auto-assigned). Mirrors mobile's fallbackPosition.
export function fallbackPosition(index: number, columns = 2): BoardPosition {
  const col = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: (col + 0.5) / columns,
    y: Math.min(0.15 + row * 0.24, 0.9),
  };
}
