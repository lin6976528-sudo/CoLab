export interface ParsedError {
  title: string;
  message: string;
  suggestion: string;
}

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
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function isFirestoreOfflineError(error: unknown): boolean {
  if (!error) return false;
  const code = (error as any)?.code;
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    code === 'unavailable' ||
    lower.includes('client is offline') ||
    lower.includes('failed to get document because the client is offline') ||
    lower.includes('network error')
  );
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, auth: any) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function parseAIError(error: any, t: any): ParsedError {
  const msg = error?.message?.toLowerCase() || String(error).toLowerCase();
  
  if (msg.includes('quota') || msg.includes('429')) {
    return {
      title: t('common.errors.quota.title'),
      message: t('common.errors.quota.message'),
      suggestion: t('common.errors.quota.suggestion')
    };
  }
  if (msg.includes('key') || msg.includes('403') || msg.includes('permission') || msg.includes('unauthorized')) {
    return {
      title: t('common.errors.auth.title'),
      message: t('common.errors.auth.message'),
      suggestion: t('common.errors.auth.suggestion')
    };
  }
  if (msg.includes('safety') || msg.includes('blocked')) {
    return {
      title: t('common.errors.safety.title'),
      message: t('common.errors.safety.message'),
      suggestion: t('common.errors.safety.suggestion')
    };
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch')) {
    return {
      title: t('common.errors.network.title'),
      message: t('common.errors.network.message'),
      suggestion: t('common.errors.network.suggestion')
    };
  }
  if (msg.includes('not found') || msg.includes('404')) {
    return {
      title: t('common.errors.notFound.title'),
      message: t('common.errors.notFound.message'),
      suggestion: t('common.errors.notFound.suggestion')
    };
  }
  
  return {
    title: t('common.errors.default.title'),
    message: error?.message || t('common.errors.default.message'),
    suggestion: t('common.errors.default.suggestion')
  };
}
