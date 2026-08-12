import React, { useState, useEffect } from 'react';
import { GamesListScreen } from './GamesListScreen';
import { GameDetailScreen } from './GameDetailScreen';
import { TeamAssignmentScreen } from './TeamAssignmentScreen';
import { CreateGameScreen } from './CreateGameScreen';

interface MainFunctionalityScreenProps {
  route?: { params?: { screen?: 'detail'; gameId?: string } };
}

export function MainFunctionalityScreen({ route }: MainFunctionalityScreenProps) {
  const [currentScreen, setCurrentScreen] = useState<
    'list' | 'detail' | 'teamAssignment' | 'create'
  >('list');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  useEffect(() => {
    if (route?.params?.screen === 'detail' && route.params.gameId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedGameId(route.params.gameId);

      setCurrentScreen('detail');
    }
  }, [route?.params?.screen, route?.params?.gameId]);

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

  const handleNavigateToCreateGame = () => {
    setCurrentScreen('create');
  };

  const handleGameCreated = () => {
    setCurrentScreen('list');
  };

  if (currentScreen === 'create') {
    return <CreateGameScreen onGoBack={handleGoBack} onCreated={handleGameCreated} />;
  }

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

  return (
    <GamesListScreen
      onNavigateToGame={handleNavigateToGame}
      onNavigateToCreateGame={handleNavigateToCreateGame}
    />
  );
}
