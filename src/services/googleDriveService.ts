/**
 * Google Drive REST API integration service for CoLab AI Studio
 * Manages reading, writing, searching, and backing up workspace files.
 */

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  webViewLink?: string;
  parents?: string[];
}

export interface GoogleDriveListResponse {
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';

const ACCEPTED_DRIVE_LIST_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

export class GoogleDriveApiError extends Error {
  status: number;
  reason?: string;
  isInsufficientScope: boolean;
  isUnauthorized: boolean;

  constructor(
    message: string,
    options: {
      status: number;
      reason?: string;
      isInsufficientScope?: boolean;
      isUnauthorized?: boolean;
    }
  ) {
    super(message);
    this.name = 'GoogleDriveApiError';
    this.status = options.status;
    this.reason = options.reason;
    this.isInsufficientScope = Boolean(options.isInsufficientScope);
    this.isUnauthorized = Boolean(options.isUnauthorized);
  }
}

export async function verifyDriveAccessTokenScopes(accessToken: string): Promise<{
  hasDriveScope: boolean;
  confirmedMissingScope: boolean;
  scopes: string[];
}> {
  if (!accessToken) {
    return { hasDriveScope: false, confirmedMissingScope: true, scopes: [] };
  }
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    );
    if (!res.ok) {
      // Token invalid or expired
      return {
        hasDriveScope: false,
        confirmedMissingScope: res.status === 400 || res.status === 401,
        scopes: [],
      };
    }
    const data = await res.json();
    const scopeStr = typeof data.scope === 'string' ? data.scope : '';
    const scopes = scopeStr.split(/\s+/).filter(Boolean);
    const hasDriveScope = scopes.some((s: string) => ACCEPTED_DRIVE_LIST_SCOPES.includes(s));
    return {
      hasDriveScope,
      confirmedMissingScope: !hasDriveScope,
      scopes,
    };
  } catch {
    // Network / CORS failure reaching tokeninfo; let actual Drive API call decide
    return { hasDriveScope: true, confirmedMissingScope: false, scopes: [] };
  }
}

async function buildDriveApiError(response: Response, fallbackPrefix: string): Promise<GoogleDriveApiError> {
  const rawText = await response.text().catch(() => '');
  let parsedReason = '';
  let parsedMessage = '';

  try {
    const json = JSON.parse(rawText);
    parsedMessage = json?.error?.message || '';
    const detailReason = json?.error?.details?.find?.((d: any) => d?.reason)?.reason;
    const errorReason = json?.error?.errors?.[0]?.reason;
    parsedReason = detailReason || errorReason || json?.error?.status || '';
  } catch {
    parsedMessage = rawText;
  }

  const lower = `${parsedReason} ${parsedMessage} ${rawText}`.toLowerCase();
  const isInsufficientScope =
    response.status === 403 &&
    (lower.includes('access_token_scope_insufficient') ||
      lower.includes('insufficientpermissions') ||
      lower.includes('insufficient authentication scopes') ||
      lower.includes('insufficient permission'));

  const isUnauthorized = response.status === 401;

  if (isInsufficientScope) {
    return new GoogleDriveApiError(
      'Google Drive 存取權限不足（OAuth 授權範圍未包含雲端硬碟權限）。請點擊下方「Sign in with Google」按鈕重新授權，並在 Google 授權視窗中勾選雲端硬碟存取權限。',
      { status: response.status, reason: parsedReason, isInsufficientScope: true }
    );
  }

  if (isUnauthorized) {
    return new GoogleDriveApiError(
      'Google Drive 連線授權已過期或失效，請重新點擊授權連接 Google Drive。',
      { status: response.status, reason: parsedReason, isUnauthorized: true }
    );
  }

  const detail = parsedMessage || rawText || response.statusText;
  return new GoogleDriveApiError(`${fallbackPrefix} (${response.status})${detail ? `: ${detail}` : ''}`, {
    status: response.status,
    reason: parsedReason,
  });
}

/**
 * List files from the user's Google Drive
 */
export async function listDriveFiles(
  accessToken: string,
  searchQuery = '',
  _folderId = 'root'
): Promise<GoogleDriveFile[]> {
  const qParts: string[] = ['trashed = false'];

  if (searchQuery.trim()) {
    qParts.push(`name contains '${searchQuery.replace(/'/g, "\\'")}'`);
  }

  const queryParam = encodeURIComponent(qParts.join(' and '));
  const fieldsParam = encodeURIComponent('files(id, name, mimeType, size, modifiedTime, iconLink, webViewLink, parents)');
  
  const response = await fetch(
    `${DRIVE_API_BASE}/files?pageSize=50&q=${queryParam}&fields=${fieldsParam}&orderBy=modifiedTime desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw await buildDriveApiError(response, 'Google Drive API 讀取失敗');
  }

  const data: GoogleDriveListResponse = await response.json();
  return data.files || [];
}

/**
 * Read text content of a file from Google Drive
 */
export async function getDriveFileText(accessToken: string, fileId: string): Promise<string> {
  const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw await buildDriveApiError(response, '無法下載檔案內容');
  }

  return await response.text();
}

/**
 * Create a new text/JSON file or overwrite existing file in Google Drive
 * Note: Always confirm with the user before calling with an existingFileId (overwrite)!
 */
export async function uploadDriveFile(
  accessToken: string,
  name: string,
  content: string,
  mimeType = 'application/json',
  existingFileId?: string
): Promise<GoogleDriveFile> {
  const metadata = {
    name,
    mimeType,
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: mimeType }));

  const url = existingFileId
    ? `${UPLOAD_API_BASE}/files/${existingFileId}?uploadType=multipart`
    : `${UPLOAD_API_BASE}/files?uploadType=multipart`;

  const method = existingFileId ? 'PATCH' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!response.ok) {
    throw await buildDriveApiError(response, '檔案上傳至 Google Drive 失敗');
  }

  return await response.json();
}

/**
 * Delete a file from Google Drive
 * MUST BE CALLED ONLY AFTER EXPLICIT USER CONFIRMATION!
 */
export async function deleteDriveFile(accessToken: string, fileId: string): Promise<void> {
  const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    throw await buildDriveApiError(response, '刪除 Google Drive 檔案失敗');
  }
}

/**
 * Helper to format file sizes nicely
 */
export function formatFileSize(bytesStr?: string): string {
  if (!bytesStr) return '--';
  const bytes = parseInt(bytesStr, 10);
  if (isNaN(bytes)) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
