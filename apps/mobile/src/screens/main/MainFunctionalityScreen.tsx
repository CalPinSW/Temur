import React, { useState, useEffect } from 'react';
import { GamesListScreen } from './GamesListScreen';
import { GameDetailScreen } from './GameDetailScreen';
import { TeamAssignmentScreen } from './TeamAssignmentScreen';
import { CreateGameScreen } from './CreateGameScreen';
import { GameResultScreen } from './GameResultScreen';
import { EditGameScreen } from './EditGameScreen';
import { JoinGameScreen } from './JoinGameScreen';

interface MainFunctionalityScreenProps {
  route?: { params?: { screen?: 'detail' | 'join'; gameId?: string; token?: string } };
}

export function MainFunctionalityScreen({ route }: MainFunctionalityScreenProps) {
  const [currentScreen, setCurrentScreen] = useState<
    'list' | 'detail' | 'teamAssignment' | 'create' | 'result' | 'edit' | 'join'
  >('list');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  useEffect(() => {
    if (route?.params?.screen === 'detail' && route.params.gameId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedGameId(route.params.gameId);

      setCurrentScreen('detail');
    }

    if (route?.params?.screen === 'join' && route.params.token) {
      setCurrentScreen('join');
    }
  }, [route?.params?.screen, route?.params?.gameId, route?.params?.token]);

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

  if (currentScreen === 'join' && route?.params?.token) {
    return (
      <JoinGameScreen
        token={route.params.token}
        onJoined={(joinedGameId) => {
          setSelectedGameId(joinedGameId);
          setCurrentScreen('detail');
        }}
        onGoBack={handleGoBack}
      />
    );
  }

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
