'use client';

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { getPlayerDisplayName, type BoardPosition, type PlayerGameWithProfile } from '@temur/shared';
import { computeNormalizedPosition, fallbackPosition } from './boardGeometry';

type BoxId = 'pool' | 'team1' | 'team2';

const BOX_HEIGHT = 224;

function playerLabel(pg: PlayerGameWithProfile) {
  return getPlayerDisplayName(pg) + (pg.is_ringer ? ' (Ringer)' : '');
}

function PlayerChip({ id, label, team }: { id: string; label: string; team: number | null }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const borderClass =
    team === 1 ? 'border-[#3B82F6]' : team === 2 ? 'border-[#EF4444]' : 'border-border';

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        touchAction: 'none',
      }}
      className={`cursor-grab touch-none rounded-full border-2 bg-card px-3 py-1.5 text-xs font-medium whitespace-nowrap text-text select-none active:cursor-grabbing ${borderClass} ${
        isDragging ? 'z-50 opacity-80' : ''
      }`}
    >
      {label}
    </button>
  );
}

function Box({
  id,
  label,
  borderClassName,
  height,
  children,
}: {
  id: BoxId;
  label: string;
  borderClassName: string;
  height?: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      style={height ? { height } : undefined}
      className={`relative rounded-xl border-2 p-2 transition-colors ${borderClassName} ${
        isOver ? 'bg-background-secondary' : 'bg-card'
      }`}
    >
      {label && (
        <span className="mb-1 block text-xs font-semibold text-text-secondary">{label}</span>
      )}
      {children}
    </div>
  );
}

export function TeamAssignmentBoard({
  players,
  assignments,
  positions,
  team1Name,
  team2Name,
  onMovePlayer,
}: {
  players: PlayerGameWithProfile[];
  assignments: Record<string, number | null>;
  positions: Record<string, BoardPosition | null>;
  team1Name: string;
  team2Name: string;
  onMovePlayer: (playerGameId: string, team: number | null, position: BoardPosition | null) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const poolPlayers = players.filter((p) => !assignments[p.id]);
  const team1Players = players.filter((p) => assignments[p.id] === 1);
  const team2Players = players.filter((p) => assignments[p.id] === 2);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const playerGameId = String(active.id);
    const boxId = over.id as BoxId;

    if (boxId === 'pool') {
      onMovePlayer(playerGameId, null, null);
      return;
    }

    const activeRect = active.rect.current.translated;
    if (!activeRect) return;

    const point = {
      x: activeRect.left + activeRect.width / 2,
      y: activeRect.top + activeRect.height / 2,
    };
    const team = boxId === 'team1' ? 1 : 2;
    const position = computeNormalizedPosition(point, over.rect);
    onMovePlayer(playerGameId, team, position);
  };

  const renderBoxPlayers = (boxPlayers: PlayerGameWithProfile[]) =>
    boxPlayers.map((pg, index) => {
      const pos = positions[pg.id] ?? fallbackPosition(index);
      return (
        <div
          key={pg.id}
          style={{
            position: 'absolute',
            left: `${pos.x * 100}%`,
            top: `${pos.y * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <PlayerChip id={pg.id} label={playerLabel(pg)} team={assignments[pg.id]} />
        </div>
      );
    });

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-3">
        <p className="text-xs text-text-tertiary">Drag players between the boxes to set up teams</p>

        <Box id="pool" label="" borderClassName="border-dashed border-border-light">
          {poolPlayers.length === 0 ? (
            <span className="text-xs text-text-tertiary">All players assigned</span>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2 py-1">
              {poolPlayers.map((pg) => (
                <PlayerChip key={pg.id} id={pg.id} label={playerLabel(pg)} team={null} />
              ))}
            </div>
          )}
        </Box>

        <div className="flex flex-col gap-3">
          <Box id="team1" label={team1Name} borderClassName="border-[#3B82F6]" height={BOX_HEIGHT}>
            {renderBoxPlayers(team1Players)}
          </Box>
          <Box id="team2" label={team2Name} borderClassName="border-[#EF4444]" height={BOX_HEIGHT}>
            {renderBoxPlayers(team2Players)}
          </Box>
        </div>
      </div>
    </DndContext>
  );
}
