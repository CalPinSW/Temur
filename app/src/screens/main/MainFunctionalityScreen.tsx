import React, { useState } from 'react';
import { GamesListScreen } from './GamesListScreen';
import { GameDetailScreen } from './GameDetailScreen';
import { TeamAssignmentScreen } from './TeamAssignmentScreen';

export function MainFunctionalityScreen() {
  const [currentScreen, setCurrentScreen] = useState<'list' | 'detail' | 'teamAssignment'>('list');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const handleNavigateToGame = (gameId: string) => {
    setSelectedGameId(gameId);
    setCurrentScreen('detail');
  };

  const handleGoBack = () => {
    setCurrentScreen('list');
    setSelectedGameId(null);
  };

  const handleNavigateToTeamAssignment = (gameId: string) => {
    setSelectedGameId(gameId);
    setCurrentScreen('teamAssignment');
  };

  const handleBackToDetail = () => {
    setCurrentScreen('detail');
  };

  if (currentScreen === 'teamAssignment' && selectedGameId) {
    return <TeamAssignmentScreen gameId={selectedGameId} onGoBack={handleBackToDetail} />;
  }

  if (currentScreen === 'detail' && selectedGameId) {
    return (
      <GameDetailScreen
        gameId={selectedGameId}
        onGoBack={handleGoBack}
        onNavigateToTeamAssignment={handleNavigateToTeamAssignment}
      />
    );
  }

  return <GamesListScreen onNavigateToGame={handleNavigateToGame} />;
}
