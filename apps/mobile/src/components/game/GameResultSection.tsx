import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { ThemedTextBox, ThemedButton, ThemedInput } from '@/components/themed';
import { useGameResult } from '@/hooks/useGameResult';
import { GameOutcome, formatGameResult } from '@temur/shared';

interface GameResultSectionProps {
  gameId: string;
  team1Name: string;
  team2Name: string;
  resultTeam1Score: number | null;
  resultTeam2Score: number | null;
  resultOutcome: GameOutcome | null;
  onSaved: () => void;
}

export function GameResultSection({
  gameId,
  team1Name,
  team2Name,
  resultTeam1Score,
  resultTeam2Score,
  resultOutcome,
  onSaved,
}: GameResultSectionProps) {
  const hasResult = resultTeam1Score !== null || resultOutcome !== null;
  const [isEditing, setIsEditing] = useState(!hasResult);
  const [entryMode, setEntryMode] = useState<'score' | 'outcome'>(
    resultOutcome !== null ? 'outcome' : 'score'
  );
  const [team1ScoreInput, setTeam1ScoreInput] = useState(resultTeam1Score?.toString() ?? '');
  const [team2ScoreInput, setTeam2ScoreInput] = useState(resultTeam2Score?.toString() ?? '');
  const [outcomeInput, setOutcomeInput] = useState<GameOutcome | null>(resultOutcome);

  const { isSaving, saveScore, saveOutcome } = useGameResult(gameId);

  const handleSave = () => {
    if (entryMode === 'score') {
      const team1Score = Number(team1ScoreInput);
      const team2Score = Number(team2ScoreInput);

      if (
        !Number.isInteger(team1Score) ||
        !Number.isInteger(team2Score) ||
        team1Score < 0 ||
        team2Score < 0
      ) {
        Alert.alert('Invalid score', 'Enter a whole number for each team.');
        return;
      }

      saveScore(team1Score, team2Score, () => {
        setIsEditing(false);
        onSaved();
      });
      return;
    }

    if (!outcomeInput) {
      Alert.alert('Select a result', 'Choose a winner or a draw.');
      return;
    }

    saveOutcome(outcomeInput, () => {
      setIsEditing(false);
      onSaved();
    });
  };

  if (!isEditing) {
    return (
      <View>
        <ThemedTextBox variant="body" color="primary" weight="semibold">
          {formatGameResult(
            team1Name,
            team2Name,
            resultTeam1Score,
            resultTeam2Score,
            resultOutcome
          ) ?? ''}
        </ThemedTextBox>
        <ThemedButton
          title="Edit Result"
          variant="outline"
          onPress={() => setIsEditing(true)}
          style={styles.editButton}
        />
      </View>
    );
  }

  return (
    <View>
      <View style={styles.modeToggle}>
        <ThemedButton
          title="Score"
          size="small"
          variant={entryMode === 'score' ? 'primary' : 'outline'}
          onPress={() => setEntryMode('score')}
          style={styles.modeButton}
        />
        <ThemedButton
          title="Win / Draw / Loss"
          size="small"
          variant={entryMode === 'outcome' ? 'primary' : 'outline'}
          onPress={() => setEntryMode('outcome')}
          style={styles.modeButton}
        />
      </View>

      {entryMode === 'score' ? (
        <View style={styles.scoreRow}>
          <View style={styles.scoreInput}>
            <ThemedInput
              label={team1Name}
              value={team1ScoreInput}
              onChangeText={setTeam1ScoreInput}
              keyboardType="number-pad"
              placeholder="0"
            />
          </View>
          <View style={styles.scoreInput}>
            <ThemedInput
              label={team2Name}
              value={team2ScoreInput}
              onChangeText={setTeam2ScoreInput}
              keyboardType="number-pad"
              placeholder="0"
            />
          </View>
        </View>
      ) : (
        <View style={styles.outcomeOptions}>
          <ThemedButton
            title={`${team1Name} won`}
            variant={outcomeInput === 'team1_win' ? 'primary' : 'outline'}
            onPress={() => setOutcomeInput('team1_win')}
          />
          <ThemedButton
            title="Draw"
            variant={outcomeInput === 'draw' ? 'primary' : 'outline'}
            onPress={() => setOutcomeInput('draw')}
          />
          <ThemedButton
            title={`${team2Name} won`}
            variant={outcomeInput === 'team2_win' ? 'primary' : 'outline'}
            onPress={() => setOutcomeInput('team2_win')}
          />
        </View>
      )}

      <View style={styles.saveRow}>
        {hasResult && (
          <ThemedButton
            title="Cancel"
            variant="ghost"
            onPress={() => setIsEditing(false)}
            style={styles.saveButton}
          />
        )}
        <ThemedButton
          title={isSaving ? 'Saving...' : 'Save Result'}
          variant="primary"
          onPress={handleSave}
          disabled={isSaving}
          style={styles.saveButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeButton: {
    flex: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scoreInput: {
    flex: 1,
  },
  outcomeOptions: {
    gap: 8,
  },
  saveRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  saveButton: {
    flex: 1,
  },
});
