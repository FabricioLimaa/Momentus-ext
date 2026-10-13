/**
 * Representa o nível e rank do usuário com base nos seus pontos totais (XP).
 * Equivalente fiel ao UserLevel.kt do Momentus nativo.
 */

export interface UserLevelInfo {
  level: number;
  rankName: string;
  currentXp: number;
  nextLevelXp: number;
  progress: number;
  rankColor: string;
}

export const calculateUserLevel = (totalPoints: number): UserLevelInfo => {
  if (totalPoints < 100) {
    return {
      level: 1,
      rankName: 'Iniciante',
      currentXp: totalPoints,
      nextLevelXp: 100,
      progress: totalPoints / 100,
      rankColor: '#9E9E9E',
    };
  }

  if (totalPoints < 300) {
    const current = totalPoints - 100;
    return {
      level: 2,
      rankName: 'Determinado',
      currentXp: current,
      nextLevelXp: 200,
      progress: current / 200,
      rankColor: '#4CAF50',
    };
  }

  if (totalPoints < 600) {
    const current = totalPoints - 300;
    return {
      level: 3,
      rankName: 'Focado',
      currentXp: current,
      nextLevelXp: 300,
      progress: current / 300,
      rankColor: '#2196F3',
    };
  }

  if (totalPoints < 1000) {
    const current = totalPoints - 600;
    return {
      level: 4,
      rankName: 'Constante',
      currentXp: current,
      nextLevelXp: 400,
      progress: current / 400,
      rankColor: '#9C27B0',
    };
  }

  // Nível 5 em diante
  const excess = totalPoints - 1000;
  const levelsAbove5 = Math.floor(excess / 500);
  const xpInCurrent = excess % 500;

  return {
    level: 5 + levelsAbove5,
    rankName: 'Mestre da Rotina',
    currentXp: xpInCurrent,
    nextLevelXp: 500,
    progress: xpInCurrent / 500,
    rankColor: '#FFD700',
  };
};

