import React, { useState, useEffect } from 'react';
import { DriveSavedForecast } from '../types/commodity';
import { listSavedForecastsFromDrive, deleteForecastFromDrive, getForecastFileContent } from '../lib/drive';
import { ConfirmModal } from './ConfirmModal';
import {
  HardDrive,
  RefreshCw,
  Trash2,
  ExternalLink,
  Eye,
  X,
  FileText,
  FileCode,
  Code2,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface DriveDossierManagerProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onRefreshCount: (count: number) => void;
}

export const DriveDossierManager: React.FC<DriveDossierManagerProps> = ({
  isOpen,
  onClose,
  accessToken,
  onRefreshCount,
}) => {
  const [files, setFiles] = useState<DriveSavedForecast[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File Preview state
  const [previewFile, setPreviewFile] = useState<DriveSavedForecast | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // File Delete Confirmation state (MANDATORY for Workspace Destructive operations!)
  const [fileToDelete, setFileToDelete] = useState<DriveSavedForecast | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFiles = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const list = await listSavedForecastsFromDrive(accessToken);
      setFiles(list);
      onRefreshCount(list.length);
    } catch (err: any) {
      console.error('Failed to list files from Google Drive:', err);
      setError(err.message || 'Failed to retrieve files from Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      fetchFiles();
    }
  }, [isOpen, accessToken]);

  const handlePreview = async (file: DriveSavedForecast) => {
    if (!accessToken) return;
    setPreviewFile(file);
    setIsPreviewLoading(true);
    try {
      const content = await getForecastFileContent(accessToken, file.id);
      setPreviewContent(content);
    } catch (err: any) {
      setPreviewContent(`Unable to load file preview: ${err.message}`);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!accessToken || !fileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteForecastFromDrive(accessToken, fileToDelete.id);
      // Remove from state
      const updated = files.filter((f) => f.id !== fileToDelete.id);
      setFiles(updated);
      onRefreshCount(updated.length);
      if (previewFile?.id === fileToDelete.id) {
        setPreviewFile(null);
        setPreviewContent(null);
      }
      setFileToDelete(null);
    } catch (err: any) {
      alert(`Failed to delete file: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
        <div className="w-full max-w-4xl bg-[#10141E] border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Google Drive Intelligence Dossiers</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-600/40">
                    {files.length} Saved
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Synchronized forecasts, research memos, and datasets stored in your Google Drive
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchFiles}
                disabled={isLoading}
                title="Refresh Google Drive files"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content Area: Files list + Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 flex-1 overflow-hidden min-h-[350px]">
            {/* File List */}
            <div className="bg-[#0b0e14] border border-slate-800/80 rounded-xl p-3 overflow-y-auto space-y-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400 mb-2" />
                  <span>Loading dossiers from Google Drive...</span>
                </div>
              ) : error ? (
                <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 text-xs p-4">
                  <HardDrive className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-300 mb-1">No dossiers saved yet</p>
                  <p className="text-[11px] text-slate-500">
                    Click "Save to Google Drive" on any commodity forecast to save an executive memo or dataset.
                  </p>
                </div>
              ) : (
                files.map((file) => {
                  const isSelected = previewFile?.id === file.id;
                  const isMd = file.name.endsWith('.md');
                  const isHtml = file.name.endsWith('.html');
                  const isJson = file.name.endsWith('.json');

                  return (
                    <div
                      key={file.id}
                      className={`p-3 rounded-lg border transition-all text-xs ${
                        isSelected
                          ? 'bg-[#151D2E] border-blue-500/80 shadow-xs'
                          : 'bg-[#10141e] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {isMd && <FileText className="w-4 h-4 text-blue-400 shrink-0" />}
                          {isHtml && <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />}
                          {isJson && <Code2 className="w-4 h-4 text-amber-400 shrink-0" />}
                          <span className="font-medium text-slate-200 truncate" title={file.name}>
                            {file.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Preview Button */}
                          <button
                            onClick={() => handlePreview(file)}
                            title="Preview file content"
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Open in Drive Button */}
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              title="Open in Google Drive"
                              className="p-1 text-slate-400 hover:text-blue-400 rounded hover:bg-slate-800 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Delete Button (Triggers mandatory confirm modal) */}
                          <button
                            onClick={() => setFileToDelete(file)}
                            title="Delete file from Google Drive"
                            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {file.createdTime ? new Date(file.createdTime).toLocaleDateString() : 'Recent'}
                        </span>
                        {file.size && <span>{Math.round(parseInt(file.size) / 1024)} KB</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Preview Pane */}
            <div className="bg-[#0b0e14] border border-slate-800/80 rounded-xl p-4 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-mono text-slate-400">
                <span>PREVIEW PANE</span>
                {previewFile && <span className="text-blue-400 truncate max-w-[200px]">{previewFile.name}</span>}
              </div>

              <div className="flex-1 overflow-y-auto">
                {isPreviewLoading ? (
                  <div className="flex items-center justify-center h-48 text-xs text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400 mr-2" />
                    <span>Loading preview...</span>
                  </div>
                ) : previewContent ? (
                  <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
                    {previewContent}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 text-xs p-4">
                    <Eye className="w-6 h-6 mb-2 opacity-50" />
                    <p>Select a file to inspect its thesis, forecast metrics, and raw data.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>All mutations respect Google Drive permission scope least-privilege policies.</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog for Destructive Operations */}
      <ConfirmModal
        isOpen={Boolean(fileToDelete)}
        title="Delete File from Google Drive"
        message="Are you sure you want to permanently delete this commodity forecast dossier from your Google Drive? This action cannot be undone."
        itemDetails={fileToDelete ? `${fileToDelete.name} (ID: ${fileToDelete.id})` : undefined}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete from Drive'}
        cancelLabel="Keep File"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setFileToDelete(null)}
      />
    </>
  );
};
