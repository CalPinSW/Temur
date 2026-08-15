'use client';

export function PlayerAssignmentRow({
  playerName,
  position,
  currentTeam,
  onAssignTeam,
}: {
  playerName: string;
  position: number;
  currentTeam: number | null;
  onAssignTeam: (team: number | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-light py-3 last:border-b-0">
      <span className="flex-1 text-sm text-text">
        {position}. {playerName}
      </span>

      <div className="flex items-center gap-2">
        {currentTeam !== null && (
          <button
            type="button"
            onClick={() => onAssignTeam(null)}
            aria-label="Unassign"
            className="rounded-lg border border-border px-2 py-1.5 text-xs text-text-tertiary hover:bg-background-secondary"
          >
            ✕
          </button>
        )}
        <button
          type="button"
          onClick={() => onAssignTeam(currentTeam === 1 ? null : 1)}
          className={`w-10 rounded-lg border-2 py-1.5 text-xs font-semibold transition-colors ${
            currentTeam === 1
              ? 'border-[#3B82F6] bg-[#3B82F6] text-white'
              : 'border-border text-text-secondary hover:bg-background-secondary'
          }`}
        >
          T1
        </button>
        <button
          type="button"
          onClick={() => onAssignTeam(currentTeam === 2 ? null : 2)}
          className={`w-10 rounded-lg border-2 py-1.5 text-xs font-semibold transition-colors ${
            currentTeam === 2
              ? 'border-[#EF4444] bg-[#EF4444] text-white'
              : 'border-border text-text-secondary hover:bg-background-secondary'
          }`}
        >
          T2
        </button>
      </div>
    </div>
  );
}
