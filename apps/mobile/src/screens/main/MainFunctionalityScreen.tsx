import React, { useState, useEffect } from 'react';
import { GamesListScreen } from './GamesListScreen';
import { GameDetailScreen } from './GameDetailScreen';
import { TeamAssignmentScreen } from './TeamAssignmentScreen';
import { CreateGameScreen } from './CreateGameScreen';
import { GameResultScreen } from './GameResultScreen';
import { EditGameScreen } from './EditGameScreen';

interface MainFunctionalityScreenProps {
  route?: { params?: { screen?: 'detail'; gameId?: string } };
}

export function MainFunctionalityScreen({ route }: MainFunctionalityScreenProps) {
  const [currentScreen, setCurrentScreen] = useState<
    'list' | 'detail' | 'teamAssignment' | 'create' | 'result' | 'edit'
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

  const handleNavigateToGameResult = (gameId: string) => {
    setSelectedGameId(gameId);
    setCurrentScreen('result');
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

  const handleNavigateToEditGame = (gameId: string) => {
    setSelectedGameId(gameId);
    setCurrentScreen('edit');
  };

  if (currentScreen === 'create') {
    return <CreateGameScreen onGoBack={handleGoBack} onCreated={handleGameCreated} />;
  }

  if (currentScreen === 'edit' && selectedGameId) {
    return (
      <EditGameScreen
        gameId={selectedGameId}
        onGoBack={handleBackToDetail}
        onSaved={handleBackToDetail}
      />
    );
  }

  if (currentScreen === 'teamAssignment' && selectedGameId) {
    return <TeamAssignmentScreen gameId={selectedGameId} onGoBack={handleBackToDetail} />;
  }

  if (currentScreen === 'result' && selectedGameId) {
    return <GameResultScreen gameId={selectedGameId} onGoBack={handleBackToDetail} />;
  }

  if (currentScreen === 'detail' && selectedGameId) {
    return (
      <GameDetailScreen
        gameId={selectedGameId}
        onGoBack={handleGoBack}
        onNavigateToTeamAssignment={handleNavigateToTeamAssignment}
        onNavigateToGameResult={handleNavigateToGameResult}
        onNavigateToEditGame={handleNavigateToEditGame}
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
