import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocFromServer,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  INITIAL_CATEGORIAS,
  INITIAL_ATIVIDADES,
  INITIAL_EQUIPES,
  INITIAL_PROFILES,
  INITIAL_LANCAMENTOS,
  INITIAL_MESES_FECHADOS,
  INITIAL_AUDITORIA,
  INITIAL_EQUIPE_ATIVIDADES,
  INITIAL_EQUIPE_MEMBROS
} from './supabase';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use long polling to guarantee connectivity inside iframe sandboxes
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId || undefined);
} catch {
  dbInstance = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
}

export const db = dbInstance;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.warn('Firestore notice (operating in offline fallback mode):', JSON.stringify(errInfo));
  return errInfo;
}

let isInitialized = false;

/**
 * Testa a conexão e popula o banco Firestore em nuvem com os dados iniciais caso esteja vazio
 */
export async function inicializarFirestore(): Promise<void> {
  if (isInitialized) return;

  try {
    // 1. Testa a conectividade com tratamento gracioso de offline
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (testErr) {
      if (testErr instanceof Error && testErr.message.includes('the client is offline')) {
        console.warn('Conexão inicial: o Firestore está operando em cache/offline no momento.');
      }
    }

    // 2. Verificar se já existem atividades
    const ativSnap = await getDocs(collection(db, 'atividades'));
    if (ativSnap.empty) {
      console.log('Populando Firestore com seed inicial de RH...');
      const batch = writeBatch(db);

      // Categorias
      INITIAL_CATEGORIAS.forEach(cat => {
        batch.set(doc(db, 'categorias_atividade', cat.id), cat);
      });

      // Atividades
      INITIAL_ATIVIDADES.forEach(ativ => {
        batch.set(doc(db, 'atividades', ativ.id), ativ);
      });

      // Equipes
      INITIAL_EQUIPES.forEach(eq => {
        batch.set(doc(db, 'equipes', eq.id), eq);
      });

      // Perfis
      INITIAL_PROFILES.forEach(p => {
        batch.set(doc(db, 'profiles', p.id), p);
      });

      // Lançamentos
      INITIAL_LANCAMENTOS.forEach(l => {
        batch.set(doc(db, 'lancamentos', l.id), l);
      });

      // Meses Fechados
      INITIAL_MESES_FECHADOS.forEach(mf => {
        batch.set(doc(db, 'meses_fechados', mf.id), mf);
      });

      // Auditoria
      INITIAL_AUDITORIA.forEach(aud => {
        batch.set(doc(db, 'auditoria', aud.id), aud);
      });

      await batch.commit();
      console.log('Seed do Firestore concluído com sucesso!');
    }

    isInitialized = true;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'atividades');
  }
}

