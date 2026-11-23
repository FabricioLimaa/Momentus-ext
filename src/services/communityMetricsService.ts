import { collection, doc, getDocs, increment, setDoc } from 'firebase/firestore';
import { firestore } from '@/config/firebase';
import { getAppKv, setAppKv } from '@/database/momentusDb';
import {
  COMMUNITY_TRACKS,
  POPULAR_TEMPLATE_THRESHOLD,
} from '@/constants/communityTemplates';
import { MomentusLog } from '@/util/logger';

const COMMUNITY_METRICS_COLLECTION = 'community_template_metrics';
const LOCAL_USAGE_DELTAS_KV_KEY = 'community_template_usage_deltas_v1';
const CACHED_METRICS_KV_KEY = 'community_template_usage_cache_v1';

/**
 * Retorna o mapa base de contadores `vezesUsado` definido no catálogo curado.
 */
export function getBaselineCommunityAdoptionMap(): Record<string, number> {
  const map: Record<string, number> = {};
  COMMUNITY_TRACKS.forEach((track) => {
    track.templates.forEach((tmpl) => {
      map[tmpl.id] = tmpl.vezesUsado;
    });
  });
  return map;
}

/**
 * Indica se o template atingiu o limiar oficial de adoção (50+ clones/usos) para exibir o selo "Popular 🔥".
 */
export function isPopularCommunityTemplate(vezesUsado: number): boolean {
  return vezesUsado >= POPULAR_TEMPLATE_THRESHOLD;
}

/**
 * Formata de forma silenciosa e minimalista a contagem de usos na galeria.
 */
export function formatCommunityUsageCount(vezesUsado: number): string {
  const safe = Math.max(0, Math.floor(vezesUsado));
  if (safe === 1) return '1 uso';
  if (safe >= 1000) {
    const k = (safe / 1000).toFixed(1).replace('.', ',').replace(/,0$/, '');
    return `${k} mil usos`;
  }
  return `${safe} usos`;
}

/**
 * Carrega as métricas de adoção da Galeria da Comunidade combinando:
 * 1. Baseline curado + deltas locais persistidos no banco SQLite/AsyncStorage;
 * 2. Contadores globais no Cloud Firestore (com degradação silenciosa caso offline).
 */
export async function fetchCommunityAdoptionMetrics(): Promise<Record<string, number>> {
  const baseline = getBaselineCommunityAdoptionMap();
  const [localDeltas, cachedMap] = await Promise.all([
    getAppKv<Record<string, number>>(LOCAL_USAGE_DELTAS_KV_KEY).catch(() => null),
    getAppKv<Record<string, number>>(CACHED_METRICS_KV_KEY).catch(() => null),
  ]);

  const merged: Record<string, number> = { ...baseline };
  Object.keys(merged).forEach((id) => {
    const localDelta = localDeltas?.[id] ?? 0;
    const cachedVal = cachedMap?.[id] ?? 0;
    merged[id] = Math.max(baseline[id] + localDelta, cachedVal);
  });

  // Tenta enriquecer com contadores globais do Firestore sem bloquear ou falhar offline
  try {
    const snapshot = await getDocs(collection(firestore, COMMUNITY_METRICS_COLLECTION));
    let hasRemoteUpdates = false;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const remoteAdded = typeof data?.vezesUsado === 'number' ? data.vezesUsado : 0;
      const baseVal = baseline[docSnap.id] ?? 0;
      if (remoteAdded > 0) {
        const candidate = Math.max(baseVal + remoteAdded, remoteAdded);
        if (candidate > (merged[docSnap.id] ?? 0)) {
          merged[docSnap.id] = candidate;
          hasRemoteUpdates = true;
        }
      }
    });

    if (hasRemoteUpdates) {
      setAppKv(CACHED_METRICS_KV_KEY, merged).catch(() => {});
    }
  } catch (err) {
    MomentusLog.debug('SYNC', '[CommunityMetrics] Usando cache local/baseline para métricas da galeria:', err);
  }

  return merged;
}

/**
 * Incrementa em +1 o contador `vezesUsado` quando o usuário aplica (+ Hoje) ou salva um template da comunidade.
 * Atualiza imediatamente o armazenamento local e sincroniza atomicamente no Firestore em segundo plano.
 */
export async function incrementCommunityTemplateUsage(
  templateId: string,
  currentCount?: number
): Promise<number> {
  const baseline = getBaselineCommunityAdoptionMap();
  const baseVal = baseline[templateId] ?? 0;

  let nextCount = (currentCount ?? baseVal) + 1;

  try {
    const [localDeltas, cachedMap] = await Promise.all([
      getAppKv<Record<string, number>>(LOCAL_USAGE_DELTAS_KV_KEY).catch(() => null),
      getAppKv<Record<string, number>>(CACHED_METRICS_KV_KEY).catch(() => null),
    ]);

    const nextDeltas: Record<string, number> = { ...(localDeltas || {}) };
    nextDeltas[templateId] = (nextDeltas[templateId] ?? 0) + 1;

    nextCount = Math.max(
      nextCount,
      baseVal + nextDeltas[templateId],
      (cachedMap?.[templateId] ?? baseVal) + 1
    );

    const nextCache: Record<string, number> = {
      ...baseline,
      ...(cachedMap || {}),
      [templateId]: nextCount,
    };

    await Promise.all([
      setAppKv(LOCAL_USAGE_DELTAS_KV_KEY, nextDeltas),
      setAppKv(CACHED_METRICS_KV_KEY, nextCache),
    ]);
  } catch (err) {
    MomentusLog.db.warn('[CommunityMetrics] Erro ao persistir incremento local:', err);
  }

  // Incremento atômico no Firestore em segundo plano (sem bloquear a UX se offline/regras restritas)
  try {
    const metricRef = doc(firestore, COMMUNITY_METRICS_COLLECTION, templateId);
    await setDoc(
      metricRef,
      {
        vezesUsado: increment(1),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch {
    // Silencioso em modo offline ou ambiente sem permissão global na coleção pública
  }

  return nextCount;
}
