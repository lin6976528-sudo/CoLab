import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HardDrive,
  Folder,
  FileText,
  Cloud,
  Download,
  Upload,
  Trash2,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  Plus,
  FileCode,
  ShieldAlert,
  Calendar,
  Lock,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  listDriveFiles,
  getDriveFileText,
  uploadDriveFile,
  deleteDriveFile,
  formatFileSize,
  GoogleDriveFile,
  GoogleDriveApiError,
} from '../services/googleDriveService';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportContent?: (filename: string, content: string) => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onImportContent,
}) => {
  const {
    googleAccessToken,
    connectGoogleDrive,
    clearGoogleAccessToken,
    driveAuthError,
    clearDriveAuthError,
    isLoggingIn,
    currentUser,
  } = useAuth();

  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Confirmation Modal state for destructive operations
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionLabel: string;
    actionVariant: 'danger' | 'warning';
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Selected file preview state
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Backup form state
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupName, setBackupName] = useState(`colab-ai-backup-${new Date().toISOString().slice(0, 10)}.json`);
  const [isUploading, setIsUploading] = useState(false);

  const handleDriveError = useCallback(
    (err: unknown, fallbackMessage: string) => {
      const message = err instanceof Error ? err.message : fallbackMessage;
      const isAuthOrScopeError =
        (err instanceof GoogleDriveApiError && (err.isInsufficientScope || err.isUnauthorized)) ||
        message.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') ||
        message.includes('insufficientPermissions');

      if (isAuthOrScopeError) {
        clearGoogleAccessToken();
        setFiles([]);
        setSelectedFile(null);
        setPreviewContent(null);
        setIsBackupModalOpen(false);
      }
      setErrorMessage(message || fallbackMessage);
    },
    [clearGoogleAccessToken]
  );

  // Fetch Drive files
  const loadFiles = useCallback(
    async (token: string, q = '') => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const list = await listDriveFiles(token, q);
        setFiles(list);
      } catch (err: any) {
        handleDriveError(err, '讀取 Google Drive 檔案失敗。');
      } finally {
        setIsLoading(false);
      }
    },
    [handleDriveError]
  );

  useEffect(() => {
    if (isOpen && googleAccessToken) {
      loadFiles(googleAccessToken, searchQuery);
    }
  }, [isOpen, googleAccessToken, loadFiles]);

  useEffect(() => {
    if (driveAuthError) {
      setErrorMessage(driveAuthError);
    }
  }, [driveAuthError]);

  const handleConnect = async () => {
    setErrorMessage(null);
    clearDriveAuthError();
    const token = await connectGoogleDrive();
    if (token) {
      loadFiles(token, searchQuery);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (googleAccessToken) {
      loadFiles(googleAccessToken, searchQuery);
    }
  };

  const handleSelectFile = async (file: GoogleDriveFile) => {
    setSelectedFile(file);
    setPreviewContent(null);
    if (!googleAccessToken) return;

    // Load preview for text, JSON, markdown files
    if (
      file.mimeType.includes('text') ||
      file.mimeType.includes('json') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.json')
    ) {
      setIsPreviewLoading(true);
      try {
        const text = await getDriveFileText(googleAccessToken, file.id);
        setPreviewContent(text);
      } catch (err: any) {
        if (err instanceof GoogleDriveApiError && (err.isInsufficientScope || err.isUnauthorized)) {
          handleDriveError(err, '無法預覽檔案內容。');
        } else {
          setPreviewContent(`(預覽失敗: ${err.message})`);
        }
      } finally {
        setIsPreviewLoading(false);
      }
    }
  };

  // Perform Backup to Drive
  const handleBackupNow = async () => {
    if (!googleAccessToken) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        platform: 'Google AI Studio CoLab',
        user: currentUser?.email || 'anonymous',
        preferences: {
          theme: 'dark',
          language: 'zh-TW',
          performanceOptimizer: true,
        },
        notes: 'CoLab AI Studio 雲端快照備份',
      };

      await uploadDriveFile(
        googleAccessToken,
        backupName,
        JSON.stringify(backupData, null, 2),
        'application/json'
      );

      setSuccessMessage(`備份檔「${backupName}」已成功儲存至 Google Drive！`);
      setIsBackupModalOpen(false);
      loadFiles(googleAccessToken, searchQuery);

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      handleDriveError(err, '備份至 Google Drive 失敗。');
    } finally {
      setIsUploading(false);
    }
  };

  // MANDATORY Destructive Operation Confirmation: Delete File
  const requestDeleteFile = (file: GoogleDriveFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: '確認刪除 Google Drive 檔案',
      message: `您確定要將檔案「${file.name}」自您的 Google Drive 永久刪除嗎？此操作將修改您的雲端硬碟內容且無法復原。`,
      actionLabel: '確認永久刪除',
      actionVariant: 'danger',
      onConfirm: async () => {
        if (!googleAccessToken) return;
        try {
          await deleteDriveFile(googleAccessToken, file.id);
          setSuccessMessage(`檔案「${file.name}」已成功從 Google Drive 刪除。`);
          if (selectedFile?.id === file.id) {
            setSelectedFile(null);
            setPreviewContent(null);
          }
          loadFiles(googleAccessToken, searchQuery);
          setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err: any) {
          handleDriveError(err, '刪除失敗');
        }
      },
    });
  };

  // MANDATORY Destructive Operation Confirmation: Overwrite File
  const requestOverwriteFile = (file: GoogleDriveFile) => {
    setConfirmModal({
      isOpen: true,
      title: '確認覆寫 Google Drive 檔案',
      message: `您確定要以新的備份快照覆寫雲端硬碟中的「${file.name}」嗎？舊版內容將被更新。`,
      actionLabel: '確認覆寫檔案',
      actionVariant: 'warning',
      onConfirm: async () => {
        if (!googleAccessToken) return;
        try {
          const backupData = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            user: currentUser?.email || 'anonymous',
            updatedBy: 'CoLab AI Studio Drive Integration',
          };
          await uploadDriveFile(
            googleAccessToken,
            file.name,
            JSON.stringify(backupData, null, 2),
            'application/json',
            file.id
          );
          setSuccessMessage(`檔案「${file.name}」已成功覆寫更新！`);
          loadFiles(googleAccessToken, searchQuery);
          setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err: any) {
          handleDriveError(err, '覆寫檔案失敗');
        }
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <HardDrive size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-2">
                <span className="whitespace-nowrap">Google Drive 雲端檔案庫</span>
                {googleAccessToken && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
                    <CheckCircle2 size={12} />
                    已連線
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                瀏覽、管理或備份您的 AI Studio 專案資料至 Google 雲端硬碟
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Main Left Pane */}
          <div className="flex-1 flex flex-col border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Top Toolbar */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900">
              {googleAccessToken ? (
                <>
                  <form onSubmit={handleSearch} className="flex-1 min-w-[200px] relative">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜尋 Google Drive 中的檔案名稱..."
                      className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </form>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadFiles(googleAccessToken, searchQuery)}
                      disabled={isLoading}
                      className="p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs transition-colors cursor-pointer"
                      title="重新整理列表"
                    >
                      <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    </button>

                    <button
                      onClick={() => setIsBackupModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                      <Upload size={14} />
                      <span>備份至 Drive</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full flex items-center justify-between text-xs text-zinc-500">
                  <span>請先連接 Google Drive 帳號以查看您的雲端檔案。</span>
                </div>
              )}
            </div>

            {/* Error & Success Banners */}
            {errorMessage && (
              <div className="mx-4 mt-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start justify-between gap-2.5">
                <span className="flex items-start gap-2 leading-relaxed">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </span>
                <button
                  onClick={() => {
                    setErrorMessage(null);
                    clearDriveAuthError();
                  }}
                  className="shrink-0 p-0.5 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {successMessage && (
              <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  {successMessage}
                </span>
                <button onClick={() => setSuccessMessage(null)}>
                  <X size={14} />
                </button>
              </div>
            )}

            {/* File List Table or Connect State */}
            <div className="flex-1 overflow-y-auto p-4">
              {!googleAccessToken ? (
                /* Google Workspace OAuth Sign-in Card (official GSI Button style) */
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
                  <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Cloud size={32} />
                  </div>

                  <div className="max-w-md space-y-2">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      連線並同步 Google 雲端硬碟
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      經您同意授權後，系統即可安全讀取、檢索及備份您的 AI Studio 工作區域與檔案資料，所有操作均依照最低權限與確認流程執行。
                    </p>
                  </div>

                  {/* Styled GSI Material Button matching OAuth Guidelines */}
                  <button
                    onClick={handleConnect}
                    disabled={isLoggingIn}
                    className="group relative inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 shadow-md hover:shadow-lg transition-all cursor-pointer font-medium text-sm text-zinc-800 dark:text-zinc-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {isLoggingIn ? (
                        <RefreshCw size={18} className="animate-spin text-indigo-500" />
                      ) : (
                        <svg
                          version="1.1"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 48 48"
                          className="w-5 h-5"
                        >
                          <path
                            fill="#EA4335"
                            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                          />
                          <path
                            fill="#4285F4"
                            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                          />
                          <path
                            fill="#34A853"
                            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                          />
                        </svg>
                      )}
                    </div>
                    <span>
                      {isLoggingIn
                        ? '正在開啟 Google 授權視窗...'
                        : 'Sign in with Google (授權連接 Google Drive)'}
                    </span>
                  </button>

                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <Lock size={12} />
                    <span>採用 Google Workspace OAuth 最低授權範圍聲明</span>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="h-48 flex flex-col items-center justify-center space-y-3 text-zinc-400 text-xs">
                  <RefreshCw size={24} className="animate-spin text-indigo-500" />
                  <span>正在從您的 Google 雲端硬碟讀取檔案列表...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center space-y-2 text-zinc-400 text-xs">
                  <Folder size={32} className="text-zinc-300 dark:text-zinc-700" />
                  <p>在此資料夾中找不到任何相符的檔案。</p>
                  <button
                    onClick={() => setIsBackupModalOpen(true)}
                    className="text-indigo-500 hover:underline font-semibold"
                  >
                    立即建立首個 AI Studio 雲端備份 →
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {files.map((file) => {
                    const isSelected = selectedFile?.id === file.id;
                    return (
                      <div
                        key={file.id}
                        onClick={() => handleSelectFile(file)}
                        className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-900 dark:text-indigo-200'
                            : 'bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-xs text-indigo-500 shrink-0">
                            {file.mimeType.includes('folder') ? (
                              <Folder size={16} />
                            ) : file.mimeType.includes('json') || file.mimeType.includes('code') ? (
                              <FileCode size={16} />
                            ) : (
                              <FileText size={16} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {file.name}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                              <span>{formatFileSize(file.size)}</span>
                              <span>•</span>
                              <span>
                                {file.modifiedTime
                                  ? new Date(file.modifiedTime).toLocaleDateString()
                                  : '未知時間'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 transition-colors"
                              title="在 Google Drive 開啟"
                            >
                              <ArrowUpRight size={14} />
                            </a>
                          )}

                          <button
                            onClick={(e) => requestDeleteFile(file, e)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/15 text-zinc-400 hover:text-rose-500 transition-colors"
                            title="刪除檔案 (需二次確認)"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Preview / Action Sidebar */}
          {selectedFile && (
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60 p-4 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      檔案詳細資訊
                    </span>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1 break-words">
                    {selectedFile.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>

                {/* Preview Box */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    內容預覽
                  </span>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 max-h-48 overflow-y-auto text-xs font-mono text-zinc-700 dark:text-zinc-300">
                    {isPreviewLoading ? (
                      <div className="flex items-center gap-2 text-zinc-400 py-4 justify-center">
                        <RefreshCw size={14} className="animate-spin" />
                        <span>讀取檔案內容中...</span>
                      </div>
                    ) : previewContent !== null ? (
                      <pre className="whitespace-pre-wrap break-all">{previewContent}</pre>
                    ) : (
                      <span className="text-zinc-400 italic">
                        (此二進位或系統檔案格式暫時無法在瀏覽器中預覽文字)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                {previewContent && onImportContent && (
                  <button
                    onClick={() => {
                      onImportContent(selectedFile.name, previewContent);
                      onClose();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>載入此檔案至工作區域</span>
                  </button>
                )}

                <button
                  onClick={() => requestOverwriteFile(selectedFile)}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload size={14} />
                  <span>以新快照覆寫此檔案</span>
                </button>

                <button
                  onClick={(e) => requestDeleteFile(selectedFile, e)}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>永久刪除 (安全確認)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <ShieldAlert size={13} className="text-indigo-500" />
            所有資料異動皆遵循 Google Workspace 最低權限與雙重確認聲明
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold transition-colors cursor-pointer"
          >
            關閉視窗
          </button>
        </div>
      </motion.div>

      {/* Backup Modal */}
      <AnimatePresence>
        {isBackupModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Cloud size={20} />
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    備份 AI Studio 工作快照
                  </h3>
                </div>
                <button
                  onClick={() => setIsBackupModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                將目前的 AI Studio 系統偏好、對話狀態與提示紀錄匯出為 JSON 快照並儲存至您的 Google Drive 根目錄。
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  備份檔案名稱 (.json)
                </label>
                <input
                  type="text"
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsBackupModalOpen(false)}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleBackupNow}
                  disabled={isUploading || !backupName.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>上傳中...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>確認備份</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANDATORY Explicit User Confirmation Modal for Mutating/Destructive Actions */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-3 rounded-2xl ${
                    confirmModal.actionVariant === 'danger'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400">
                ⚠️ <span className="font-semibold">資料異動保護機制</span>：根據 Google Workspace 安全準則，您正在對外部雲端資料進行異動，請務必確認後再執行。
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  取消行動
                </button>
                <button
                  onClick={async () => {
                    const action = confirmModal.onConfirm;
                    setConfirmModal(null);
                    await action();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer ${
                    confirmModal.actionVariant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {confirmModal.actionLabel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default GoogleDriveModal;
