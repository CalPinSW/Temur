/* eslint-disable react-hooks/refs -- PanResponder/Animated.ValueXY held in useRef is RN's
   standard stable-instance pattern, not a DOM ref; panHandlers must be read during render
   to spread onto the view. */
import React, { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

export const CHIP_WIDTH = 130;
export const CHIP_HEIGHT = 38;

const TEAM_COLORS: Record<number, string> = {
  1: '#3B82F6',
  2: '#EF4444',
};

interface DraggablePlayerChipProps {
  playerName: string;
  team: number | null;
  style?: ViewStyle;
  onDragStart: () => void;
  onDragRelease: (pageX: number, pageY: number) => void;
}

export function DraggablePlayerChip({
  playerName,
  team,
  style,
  onDragStart,
  onDragRelease,
}: DraggablePlayerChipProps) {
  const { colors } = useTheme();
  const pan = useRef(new Animated.ValueXY()).current;
  const [dragging, setDragging] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
      onPanResponderGrant: () => {
        setDragging(true);
        onDragStart();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_evt, gestureState) => {
        setDragging(false);
        pan.setValue({ x: 0, y: 0 });
        onDragRelease(gestureState.moveX, gestureState.moveY);
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        pan.setValue({ x: 0, y: 0 });
      },
    })
  ).current;

  const backgroundColor = team ? TEAM_COLORS[team] : colors.backgroundTertiary;
  const textColor = team ? '#FFFFFF' : colors.text;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.chip,
        { backgroundColor, borderColor: team ? backgroundColor : colors.border },
        style,
        {
          transform: pan.getTranslateTransform(),
          zIndex: dragging ? 100 : 1,
          elevation: dragging ? 8 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
        {playerName}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: CHIP_WIDTH,
    height: CHIP_HEIGHT,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
