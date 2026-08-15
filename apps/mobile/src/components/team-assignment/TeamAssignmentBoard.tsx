import React, { useCallback, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { ThemedTextBox } from '@/components/themed';
import { BoardPosition, PlayerGameWithProfile, getPlayerDisplayName } from '@temur/shared';
import { DraggablePlayerChip, CHIP_HEIGHT, CHIP_WIDTH } from './DraggablePlayerChip';

type BoxId = 'pool' | 'team1' | 'team2';

interface BoxLayout {
  pageX: number;
  pageY: number;
  width: number;
  height: number;
}

interface TeamAssignmentBoardProps {
  players: PlayerGameWithProfile[];
  teamAssignments: Record<string, number | null>;
  boardPositions: Record<string, BoardPosition | null>;
  team1Name: string;
  team2Name: string;
  onMovePlayer: (playerGameId: string, team: number | null, position: BoardPosition | null) => void;
  onDragActiveChange: (active: boolean) => void;
}

const BOX_HEIGHT = 224;

function fallbackPosition(index: number): BoardPosition {
  const columns = 2;
  const col = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: (col + 0.5) / columns,
    y: Math.min(0.15 + row * 0.24, 0.9),
  };
}

export function TeamAssignmentBoard({
  players,
  teamAssignments,
  boardPositions,
  team1Name,
  team2Name,
  onMovePlayer,
  onDragActiveChange,
}: TeamAssignmentBoardProps) {
  const { colors } = useTheme();
  const poolRef = useRef<View>(null);
  const team1Ref = useRef<View>(null);
  const team2Ref = useRef<View>(null);
  const boxRefs: Record<BoxId, React.RefObject<View | null>> = {
    pool: poolRef,
    team1: team1Ref,
    team2: team2Ref,
  };

  const boxLayouts = useRef<Partial<Record<BoxId, BoxLayout>>>({});
  const [teamBoxWidth, setTeamBoxWidth] = useState(0);
  const [draggingBoxId, setDraggingBoxId] = useState<BoxId | null>(null);

  const measureBox = useCallback((id: BoxId) => {
    boxRefs[id].current?.measure((_x, _y, width, height, pageX, pageY) => {
      boxLayouts.current[id] = { pageX, pageY, width, height };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remeasureAll = useCallback(() => {
    (['pool', 'team1', 'team2'] as BoxId[]).forEach(measureBox);
  }, [measureBox]);

  const handleTeamBoxLayout = useCallback(
    (id: BoxId) => (event: LayoutChangeEvent) => {
      setTeamBoxWidth(event.nativeEvent.layout.width);
      measureBox(id);
    },
    [measureBox]
  );

  const handleDragStart = useCallback(
    (boxId: BoxId) => {
      remeasureAll();
      setDraggingBoxId(boxId);
      onDragActiveChange(true);
    },
    [remeasureAll, onDragActiveChange]
  );

  const handleDragRelease = useCallback(
    (playerGameId: string, pageX: number, pageY: number) => {
      onDragActiveChange(false);
      setDraggingBoxId(null);

      const entries = Object.entries(boxLayouts.current) as [BoxId, BoxLayout][];
      const target = entries.find(
        ([, layout]) =>
          pageX >= layout.pageX &&
          pageX <= layout.pageX + layout.width &&
          pageY >= layout.pageY &&
          pageY <= layout.pageY + layout.height
      );

      if (!target) return;

      const [boxId, layout] = target;

      if (boxId === 'pool') {
        onMovePlayer(playerGameId, null, null);
        return;
      }

      const team = boxId === 'team1' ? 1 : 2;
      const normX = Math.min(1, Math.max(0, (pageX - layout.pageX) / layout.width));
      const normY = Math.min(1, Math.max(0, (pageY - layout.pageY) / layout.height));
      onMovePlayer(playerGameId, team, { x: normX, y: normY });
    },
    [onMovePlayer, onDragActiveChange]
  );

  const poolPlayers = players.filter((pg) => teamAssignments[pg.id] === null);
  const team1Players = players.filter((pg) => teamAssignments[pg.id] === 1);
  const team2Players = players.filter((pg) => teamAssignments[pg.id] === 2);

  const renderBoxPlayers = (boxPlayers: PlayerGameWithProfile[], boxId: BoxId) =>
    boxPlayers.map((pg, index) => {
      const saved = boardPositions[pg.id];
      const pos = saved ?? fallbackPosition(index);
      const left = pos.x * teamBoxWidth - CHIP_WIDTH / 2;
      const top = pos.y * BOX_HEIGHT - CHIP_HEIGHT / 2;

      return (
        <DraggablePlayerChip
          key={pg.id}
          playerName={getPlayerDisplayName(pg) + (pg.is_ringer ? ' (Ringer)' : '')}
          team={teamAssignments[pg.id]}
          style={{ position: 'absolute', left, top }}
          onDragStart={() => handleDragStart(boxId)}
          onDragRelease={(pageX, pageY) => handleDragRelease(pg.id, pageX, pageY)}
        />
      );
    });

  return (
    <View style={styles.container}>
      <ThemedTextBox variant="caption" color="secondary" style={styles.hint}>
        Drag players between the boxes to set up teams
      </ThemedTextBox>

      <View
        ref={poolRef}
        onLayout={() => measureBox('pool')}
        style={[
          styles.pool,
          { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
          draggingBoxId === 'pool' && styles.dragging,
        ]}
      >
        {poolPlayers.length === 0 ? (
          <ThemedTextBox variant="caption" color="tertiary">
            All players assigned
          </ThemedTextBox>
        ) : (
          poolPlayers.map((pg) => (
            <DraggablePlayerChip
              key={pg.id}
              playerName={getPlayerDisplayName(pg) + (pg.is_ringer ? ' (Ringer)' : '')}
              team={null}
              onDragStart={() => handleDragStart('pool')}
              onDragRelease={(pageX, pageY) => handleDragRelease(pg.id, pageX, pageY)}
            />
          ))
        )}
      </View>

      <View style={styles.boxRow}>
        <View
          ref={team1Ref}
          onLayout={handleTeamBoxLayout('team1')}
          style={[
            styles.teamBox,
            { borderColor: '#3B82F6', backgroundColor: colors.backgroundSecondary },
            draggingBoxId === 'team1' && styles.dragging,
          ]}
        >
          <ThemedTextBox variant="caption" weight="semibold" style={styles.boxLabel}>
            {team1Name}
          </ThemedTextBox>
          {renderBoxPlayers(team1Players, 'team1')}
        </View>

        <View
          ref={team2Ref}
          onLayout={handleTeamBoxLayout('team2')}
          style={[
            styles.teamBox,
            { borderColor: '#EF4444', backgroundColor: colors.backgroundSecondary },
            draggingBoxId === 'team2' && styles.dragging,
          ]}
        >
          <ThemedTextBox variant="caption" weight="semibold" style={styles.boxLabel}>
            {team2Name}
          </ThemedTextBox>
          {renderBoxPlayers(team2Players, 'team2')}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  hint: {
    marginBottom: 4,
  },
  pool: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxRow: {
    flexDirection: 'column',
    gap: 12,
  },
  teamBox: {
    height: BOX_HEIGHT,
    borderWidth: 2,
    borderRadius: 12,
    padding: 8,
  },
  boxLabel: {
    marginBottom: 4,
  },
  dragging: {
    zIndex: 10,
    elevation: 10,
  },
});
