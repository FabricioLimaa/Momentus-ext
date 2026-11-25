import { Category } from '@/types';

export interface ParsedVoiceHabit {
  rawTranscript: string;
  title: string;
  date?: string; // YYYY-MM-DD
  dateLabel?: string; // "Hoje", "Amanhã", "Sexta-feira", "28/11"
  timeStart?: string; // HH:mm
  timeEnd?: string; // HH:mm
  categoryId?: string;
  categoryName?: string;
  matchedFields: {
    date: boolean;
    time: boolean;
    category: boolean;
  };
}

function normalizeStr(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(hour: number, minute: number): string {
  const h = Math.max(0, Math.min(23, Math.floor(hour)));
  const m = Math.max(0, Math.min(59, Math.floor(minute)));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = Math.min(23 * 60 + 55, h * 60 + m + minutesToAdd);
  return formatTime(Math.floor(total / 60), total % 60);
}

function capitalizeFirst(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Converte horas faladas com qualificador de período ("da tarde", "da noite", "da manhã")
 */
function applyPeriodQualifier(hour: number, period?: string): number {
  if (!period) return hour;
  const p = normalizeStr(period);
  if ((p.includes('tarde') || p.includes('noite')) && hour >= 1 && hour <= 11) {
    return hour + 12;
  }
  if (p.includes('manha') && hour === 12) {
    return 0;
  }
  return hour;
}

const WEEKDAY_MAP: Array<{ keys: string[]; dayIndex: number; label: string }> = [
  { keys: ['domingo'], dayIndex: 0, label: 'Domingo' },
  { keys: ['segunda-feira', 'segunda feira', 'segunda'], dayIndex: 1, label: 'Segunda-feira' },
  { keys: ['terca-feira', 'terca feira', 'terca'], dayIndex: 2, label: 'Terça-feira' },
  { keys: ['quarta-feira', 'quarta feira', 'quarta'], dayIndex: 3, label: 'Quarta-feira' },
  { keys: ['quinta-feira', 'quinta feira', 'quinta'], dayIndex: 4, label: 'Quinta-feira' },
  { keys: ['sexta-feira', 'sexta feira', 'sexta'], dayIndex: 5, label: 'Sexta-feira' },
  { keys: ['sabado'], dayIndex: 6, label: 'Sábado' },
];

const CATEGORY_HINTS: Array<{ catKeywords: string[]; habitKeywords: string[] }> = [
  {
    catKeywords: ['saude', 'fitness', 'bem-estar', 'bem estar', 'exercicio', 'esporte'],
    habitKeywords: [
      'academia',
      'treino',
      'correr',
      'corrida',
      'caminhada',
      'pilates',
      'yoga',
      'ioga',
      'natacao',
      'agua',
      'medico',
      'dentista',
      'alongamento',
      'meditacao',
      'dormir',
      'sono',
    ],
  },
  {
    catKeywords: ['estudo', 'estudos', 'faculdade', 'educacao', 'leitura', 'curso'],
    habitKeywords: [
      'estudar',
      'estudo',
      'prova',
      'aula',
      'curso',
      'ler',
      'leitura',
      'livro',
      'revisao',
      'ingles',
      'programacao',
      'algoritmo',
    ],
  },
  {
    catKeywords: ['trabalho', 'carreira', 'profissional', 'projetos', 'foco'],
    habitKeywords: [
      'reuniao',
      'daily',
      'sprint',
      'relatorio',
      'cliente',
      'projeto',
      'email',
      'emails',
      'apresentacao',
      'escritorio',
    ],
  },
  {
    catKeywords: ['pessoal', 'casa', 'rotina', 'lazer', 'financas'],
    habitKeywords: [
      'mercado',
      'compras',
      'pagar',
      'conta',
      'contas',
      'limpar',
      'organizar',
      'cozinhar',
    ],
  },
];

/**
 * Remove trechos já reconhecidos (data, horário, duração, categoria) preservando
 * os acentos originais do texto falado para gerar um título limpo da rotina.
 */
function stripRange(original: string, start: number, end: number): string {
  return `${original.slice(0, start)} ${original.slice(end)}`;
}

/**
 * Interpreta uma frase natural em Português (ex.: "Academia amanhã às 18h categoria Saúde")
 * e extrai título, data, horário de início/término e categoria compatível.
 */
export function parseVoiceHabitCommand(
  rawTranscript: string,
  categories: Category[],
  referenceDate: Date = new Date()
): ParsedVoiceHabit {
  const cleanedRaw = rawTranscript.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!cleanedRaw) {
    return {
      rawTranscript: '',
      title: '',
      matchedFields: { date: false, time: false, category: false },
    };
  }

  let working = cleanedRaw;
  let parsedDate: string | undefined;
  let parsedDateLabel: string | undefined;
  let parsedTimeStart: string | undefined;
  let parsedTimeEnd: string | undefined;
  let explicitDurationMinutes: number | undefined;
  let parsedCategory: Category | undefined;

  // 1. CATEGORIA EXPLÍCITA ("categoria Saúde", "na categoria Trabalho", "em Estudos")
  const normalizedForCat = normalizeStr(working);
  const explicitCatMatch = normalizedForCat.match(
    /\b(?:na\s+)?(?:categoria|tag|grupo)\s+(?:de\s+|da\s+|do\s+)?([a-z0-9\s-]{2,28})/
  );

  if (explicitCatMatch && explicitCatMatch.index !== undefined) {
    const candidatePhrase = explicitCatMatch[1].trim();
    const matchedCat = categories.find((cat) => {
      const catNorm = normalizeStr(cat.name);
      return (
        candidatePhrase.startsWith(catNorm) ||
        catNorm.startsWith(candidatePhrase.split(' ')[0]) ||
        candidatePhrase.includes(catNorm)
      );
    });

    if (matchedCat) {
      parsedCategory = matchedCat;
      // Calcula o tamanho exato até o fim do nome da categoria dentro do match
      const catNorm = normalizeStr(matchedCat.name);
      const startIdx = explicitCatMatch.index;
      const phraseStartInMatch = explicitCatMatch[0].indexOf(candidatePhrase);
      const catPosInPhrase = candidatePhrase.indexOf(catNorm);
      const cutLen =
        catPosInPhrase >= 0
          ? phraseStartInMatch + catPosInPhrase + catNorm.length
          : explicitCatMatch[0].length;
      working = stripRange(working, startIdx, startIdx + cutLen);
    }
  }

  // 2. DURAÇÃO EXPLÍCITA ("por 45 minutos", "durante 1 hora", "de 30 min")
  const normDur = normalizeStr(working);
  const durationMatch = normDur.match(
    /\b(?:por|durante)\s+(\d{1,3})\s*(h|hora|horas|min|minuto|minutos|m)\b/
  );
  if (durationMatch && durationMatch.index !== undefined) {
    const qty = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2];
    if (qty > 0) {
      explicitDurationMinutes = unit.startsWith('h') ? qty * 60 : qty;
      working = stripRange(working, durationMatch.index, durationMatch.index + durationMatch[0].length);
    }
  }

  // 3. FAIXA DE HORÁRIO ("das 14h30 às 16h", "de 9h as 10h30", "18:00 até 19:30")
  const normTimeRange = normalizeStr(working);
  const rangeRegex =
    /\b(?:das?|de)?\s*(\d{1,2})(?:[:h](\d{2})|\s*h(?:oras?)?(?:\s*e\s*(meia|\d{1,2}))?)?\s*(?:as|ate|a|-)\s*(\d{1,2})(?:[:h](\d{2})|\s*h(?:oras?)?(?:\s*e\s*(meia|\d{1,2}))?)?(?:\s+da\s+(manha|tarde|noite))?\b/;
  const rangeMatch = normTimeRange.match(rangeRegex);

  if (rangeMatch && rangeMatch.index !== undefined) {
    const hasTimeIndicator =
      rangeMatch[0].includes(':') ||
      rangeMatch[0].includes('h') ||
      rangeMatch[0].includes('as') ||
      rangeMatch[0].includes('das');

    const h1Raw = parseInt(rangeMatch[1], 10);
    const m1 = rangeMatch[2]
      ? parseInt(rangeMatch[2], 10)
      : rangeMatch[3] === 'meia'
        ? 30
        : rangeMatch[3]
          ? parseInt(rangeMatch[3], 10)
          : 0;
    const h2Raw = parseInt(rangeMatch[4], 10);
    const m2 = rangeMatch[5]
      ? parseInt(rangeMatch[5], 10)
      : rangeMatch[6] === 'meia'
        ? 30
        : rangeMatch[6]
          ? parseInt(rangeMatch[6], 10)
          : 0;

    if (hasTimeIndicator && h1Raw <= 23 && h2Raw <= 23 && m1 <= 59 && m2 <= 59) {
      const period = rangeMatch[7];
      const h1 = applyPeriodQualifier(h1Raw, period);
      const h2 = applyPeriodQualifier(h2Raw, period);
      parsedTimeStart = formatTime(h1, m1);
      if (h2 * 60 + m2 > h1 * 60 + m1) {
        parsedTimeEnd = formatTime(h2, m2);
      }
      working = stripRange(working, rangeMatch.index, rangeMatch.index + rangeMatch[0].length);
    }
  }

  // 4. HORÁRIO ÚNICO ("às 18h", "as 18:30", "18h30", "7 e meia da manhã", "ao meio-dia", "à meia-noite")
  if (!parsedTimeStart) {
    const normSingleTime = normalizeStr(working);

    const noonMatch = normSingleTime.match(/\b(?:ao\s+|as?\s+)?meio[\s-]dia(?:\s*e\s*(meia|\d{1,2}))?\b/);
    const midnightMatch = normSingleTime.match(/\b(?:a\s+|as?\s+)?meia[\s-]noite(?:\s*e\s*(meia|\d{1,2}))?\b/);

    if (noonMatch && noonMatch.index !== undefined) {
      const mins = noonMatch[1] === 'meia' ? 30 : noonMatch[1] ? parseInt(noonMatch[1], 10) : 0;
      parsedTimeStart = formatTime(12, mins);
      working = stripRange(working, noonMatch.index, noonMatch.index + noonMatch[0].length);
    } else if (midnightMatch && midnightMatch.index !== undefined) {
      const mins = midnightMatch[1] === 'meia' ? 30 : midnightMatch[1] ? parseInt(midnightMatch[1], 10) : 0;
      parsedTimeStart = formatTime(0, mins);
      working = stripRange(working, midnightMatch.index, midnightMatch.index + midnightMatch[0].length);
    } else {
      const singleRegex =
        /\b(?:as|a|para\s+as|pelas)?\s*(\d{1,2})(?:(?::|h)(\d{2})|\s*h(?:oras?)?(?:\s*e\s*(meia|\d{1,2}))?|\s+e\s+(meia))(?:\s+da\s+(manha|tarde|noite))?\b|\b(?:as|para\s+as)\s+(\d{1,2})(?:\s+da\s+(manha|tarde|noite))?\b/;
      const singleMatch = normSingleTime.match(singleRegex);

      if (singleMatch && singleMatch.index !== undefined) {
        const hRaw = parseInt(singleMatch[1] || singleMatch[6], 10);
        const mRaw = singleMatch[2]
          ? parseInt(singleMatch[2], 10)
          : singleMatch[3] === 'meia' || singleMatch[4] === 'meia'
            ? 30
            : singleMatch[3]
              ? parseInt(singleMatch[3], 10)
              : 0;
        const period = singleMatch[5] || singleMatch[7];

        if (!Number.isNaN(hRaw) && hRaw >= 0 && hRaw <= 23 && mRaw >= 0 && mRaw <= 59) {
          const finalH = applyPeriodQualifier(hRaw, period);
          parsedTimeStart = formatTime(finalH, mRaw);
          working = stripRange(working, singleMatch.index, singleMatch.index + singleMatch[0].length);
        }
      }
    }
  }

  // Calcula timeEnd padrão (+1h ou duração explícita) se tiver timeStart
  if (parsedTimeStart && !parsedTimeEnd) {
    parsedTimeEnd = addMinutesToTime(parsedTimeStart, explicitDurationMinutes || 60);
  }

  // 5. DATA ("depois de amanhã", "amanhã", "hoje", dia da semana, ou "dia 28/11" / "dia 28")
  const normDate = normalizeStr(working);
  const baseDate = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  const dayAfterMatch = normDate.match(/\b(?:para\s+)?depois\s+de\s+amanha\b/);
  const tomorrowMatch = normDate.match(/\b(?:para\s+)?amanha\b/);
  const todayMatch = normDate.match(/\b(?:para\s+)?hoje\b/);
  const explicitDateMatch = normDate.match(/\b(?:no\s+|para\s+)?(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  const dayOnlyMatch = normDate.match(/\b(?:no\s+|para\s+)?dia\s+(\d{1,2})\b/);

  if (dayAfterMatch && dayAfterMatch.index !== undefined) {
    const target = new Date(baseDate);
    target.setDate(target.getDate() + 2);
    parsedDate = formatDateIso(target);
    parsedDateLabel = 'Depois de amanhã';
    working = stripRange(working, dayAfterMatch.index, dayAfterMatch.index + dayAfterMatch[0].length);
  } else if (tomorrowMatch && tomorrowMatch.index !== undefined) {
    const target = new Date(baseDate);
    target.setDate(target.getDate() + 1);
    parsedDate = formatDateIso(target);
    parsedDateLabel = 'Amanhã';
    working = stripRange(working, tomorrowMatch.index, tomorrowMatch.index + tomorrowMatch[0].length);
  } else if (todayMatch && todayMatch.index !== undefined) {
    parsedDate = formatDateIso(baseDate);
    parsedDateLabel = 'Hoje';
    working = stripRange(working, todayMatch.index, todayMatch.index + todayMatch[0].length);
  } else if (explicitDateMatch && explicitDateMatch.index !== undefined) {
    const d = parseInt(explicitDateMatch[1], 10);
    const m = parseInt(explicitDateMatch[2], 10);
    let y = explicitDateMatch[3] ? parseInt(explicitDateMatch[3], 10) : baseDate.getFullYear();
    if (y < 100) y += 2000;
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      const target = new Date(y, m - 1, d);
      parsedDate = formatDateIso(target);
      parsedDateLabel = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
      working = stripRange(working, explicitDateMatch.index, explicitDateMatch.index + explicitDateMatch[0].length);
    }
  } else if (dayOnlyMatch && dayOnlyMatch.index !== undefined) {
    const d = parseInt(dayOnlyMatch[1], 10);
    if (d >= 1 && d <= 31) {
      const target = new Date(baseDate.getFullYear(), baseDate.getMonth(), d);
      if (target < baseDate) {
        target.setMonth(target.getMonth() + 1);
      }
      parsedDate = formatDateIso(target);
      parsedDateLabel = `${String(target.getDate()).padStart(2, '0')}/${String(target.getMonth() + 1).padStart(2, '0')}`;
      working = stripRange(working, dayOnlyMatch.index, dayOnlyMatch.index + dayOnlyMatch[0].length);
    }
  } else {
    // Verifica dias da semana ("na sexta-feira", "próxima segunda", "sábado")
    for (const wd of WEEKDAY_MAP) {
      const pattern = new RegExp(
        `\\b(?:na\\s+|no\\s+|para\\s+|proxima\\s+|proximo\\s+)?(?:${wd.keys.join('|')})\\b`
      );
      const wdMatch = normDate.match(pattern);
      if (wdMatch && wdMatch.index !== undefined) {
        const diff = (wd.dayIndex - baseDate.getDay() + 7) % 7 || 7;
        const target = new Date(baseDate);
        target.setDate(target.getDate() + diff);
        parsedDate = formatDateIso(target);
        parsedDateLabel = wd.label;
        working = stripRange(working, wdMatch.index, wdMatch.index + wdMatch[0].length);
        break;
      }
    }
  }

  // 6. CATEGORIA IMPLÍCITA (nome exato da categoria no texto ou palavra-chave semântica)
  if (!parsedCategory) {
    const normRemaining = normalizeStr(working);
    const directCat = categories.find((cat) => {
      const catNorm = normalizeStr(cat.name);
      if (catNorm.length < 3 || catNorm === 'outros' || catNorm === 'geral') return false;
      const regex = new RegExp(`\\b${catNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      return regex.test(normRemaining);
    });

    if (directCat) {
      parsedCategory = directCat;
    } else {
      // Inferência semântica suave sem alterar o título (ex.: "Academia" -> Saúde)
      const fullNorm = normalizeStr(cleanedRaw);
      for (const hint of CATEGORY_HINTS) {
        const hasHabitWord = hint.habitKeywords.some((kw) => new RegExp(`\\b${kw}\\b`).test(fullNorm));
        if (!hasHabitWord) continue;
        const matched = categories.find((cat) => {
          const catNorm = normalizeStr(cat.name);
          return hint.catKeywords.some((ck) => catNorm.includes(ck));
        });
        if (matched) {
          parsedCategory = matched;
          break;
        }
      }
    }
  }

  // 7. LIMPEZA FINAL DO TÍTULO (remove preposições/pontuações soltas nas extremidades)
  const cleanTitle = working
    .replace(/\s+/g, ' ')
    .replace(/^[,.\-–—:;]+|[,.\-–—:;]+$/g, '')
    .replace(/\b(?:as|para|na|no|de|da|do|em|com)\s*$/i, '')
    .replace(/^(?:criar|adicionar|agendar|marcar|nova rotina|rotina)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    rawTranscript: cleanedRaw,
    title: capitalizeFirst(cleanTitle || cleanedRaw),
    date: parsedDate,
    dateLabel: parsedDateLabel,
    timeStart: parsedTimeStart,
    timeEnd: parsedTimeEnd,
    categoryId: parsedCategory?.id,
    categoryName: parsedCategory?.name,
    matchedFields: {
      date: Boolean(parsedDate),
      time: Boolean(parsedTimeStart),
      category: Boolean(parsedCategory),
    },
  };
}
