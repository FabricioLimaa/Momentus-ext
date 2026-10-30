/**
 * Representa o nível e rank do usuário com base nos seus pontos totais (XP).
 * Equivalente fiel ao UserLevel.kt do Momentus nativo.
 */

export interface UserLevelInfo {
  level: number;
  rankName: string;
  honorTitle: string;
  currentXp: number;
  nextLevelXp: number;
  progress: number;
  rankColor: string;
}

export const calculateUserLevel = (totalPoints: number): UserLevelInfo => {
  // Nível 1: 0 - 99 XP
  if (totalPoints < 100) {
    return {
      level: 1,
      rankName: 'Iniciante Focado 🌱',
      honorTitle: 'Iniciante Focado',
      currentXp: totalPoints,
      nextLevelXp: 100,
      progress: totalPoints / 100,
      rankColor: '#9E9E9E',
    };
  }

  // Nível 2: 100 - 299 XP (Nível 2 a 4)
  if (totalPoints < 300) {
    const current = totalPoints - 100;
    return {
      level: 2,
      rankName: 'Iniciante Focado 🌱',
      honorTitle: 'Iniciante Focado',
      currentXp: current,
      nextLevelXp: 200,
      progress: current / 200,
      rankColor: '#34D399',
    };
  }

  // Nível 3: 300 - 599 XP (Nível 3)
  if (totalPoints < 600) {
    const current = totalPoints - 300;
    return {
      level: 3,
      rankName: 'Iniciante Focado 🌱',
      honorTitle: 'Iniciante Focado',
      currentXp: current,
      nextLevelXp: 300,
      progress: current / 300,
      rankColor: '#38BDF8',
    };
  }

  // Nível 4: 600 - 999 XP (Nível 4)
  if (totalPoints < 1000) {
    const current = totalPoints - 600;
    return {
      level: 4,
      rankName: 'Iniciante Focado 🌱',
      honorTitle: 'Iniciante Focado',
      currentXp: current,
      nextLevelXp: 400,
      progress: current / 400,
      rankColor: '#818CF8',
    };
  }

  // Nível 5 em diante (Cada 500 XP = +1 nível)
  const excess = totalPoints - 1000;
  const levelsAbove5 = Math.floor(excess / 500);
  const currentLvl = 5 + levelsAbove5;
  const xpInCurrent = excess % 500;

  // Nomenclatura oficial por patamar:
  // Nível 5 a 14: Praticante Consistente ⚡
  // Nível 15 a 29: Estrategista do Tempo 🎯
  // Nível 30 a 49: Mestre da Rotina 🏆
  // Nível 50+: Lenda da Produtividade 👑
  let rankName = 'Praticante Consistente ⚡';
  let honorTitle = 'Praticante Consistente';
  let rankColor = '#4CAF50';

  if (currentLvl >= 50) {
    rankName = 'Lenda da Produtividade 👑';
    honorTitle = 'Lenda da Produtividade';
    rankColor = '#F43F5E';
  } else if (currentLvl >= 30) {
    rankName = 'Mestre da Rotina 🏆';
    honorTitle = 'Mestre da Rotina';
    rankColor = '#FFD700';
  } else if (currentLvl >= 15) {
    rankName = 'Estrategista do Tempo 🎯';
    honorTitle = 'Estrategista do Tempo';
    rankColor = '#A855F7';
  } else {
    rankName = 'Praticante Consistente ⚡';
    honorTitle = 'Praticante Consistente';
    rankColor = '#34D399';
  }

  return {
    level: currentLvl,
    rankName,
    honorTitle,
    currentXp: xpInCurrent,
    nextLevelXp: 500,
    progress: xpInCurrent / 500,
    rankColor,
  };
};

