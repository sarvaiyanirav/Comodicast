import React, { useState } from 'react';
import {
  GitBranch,
  Github,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Key,
  FolderGit2,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface GitHubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubSyncModal: React.FC<GitHubSyncModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'push' | 'download' | 'native'>('push');

  // Push form state
  const [repoUrl, setRepoUrl] = useState('');
  const [token, setToken] = useState('');
  const [branch, setBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState('CommodiCast commodity price prediction release');
  const [isPushing, setIsPushing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushSuccess, setPushSuccess] = useState<{ message: string; repoUrl: string; branch: string } | null>(null);

  if (!isOpen) return null;

  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim() || !token.trim()) {
      setPushError('Please enter both your GitHub Repository URL and Personal Access Token.');
      return;
    }

    setIsPushing(true);
    setPushError(null);
    setPushSuccess(null);

    try {
      const response = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          token: token.trim(),
          branch: branch.trim() || 'main',
          commitMessage: commitMessage.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync with GitHub');
      }

      setPushSuccess({
        message: data.message,
        repoUrl: data.repoUrl,
        branch: data.branch,
      });
    } catch (err: any) {
      setPushError(err.message || 'Error pushing to GitHub');
    } finally {
      setIsPushing(false);
    }
  };

  const handleDownloadZip = () => {
    window.location.href = '/api/download-zip';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-[#111622] border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-white border border-slate-700">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Sync Project with GitHub</span>
              </h3>
              <p className="text-xs text-slate-400">
                Push code directly to your GitHub repository or export clean codebase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2 mt-4 p-1 bg-[#090C12] rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('push')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'push'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Direct Push
          </button>
          <button
            onClick={() => setActiveTab('download')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'download'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Download ZIP
          </button>
          <button
            onClick={() => setActiveTab('native')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'native'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Studio Export
          </button>
        </div>

        {/* Tab 1: Direct Push */}
        {activeTab === 'push' && (
          <div className="mt-4">
            {pushSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/50 text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Repository Synchronized!</h4>
                <p className="text-xs text-slate-300">{pushSuccess.message}</p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <a
                    href={pushSuccess.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    <span>View Repository on GitHub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePush} className="space-y-3.5">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    GitHub Repository URL:
                  </label>
                  <div className="relative">
                    <FolderGit2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/your-username/your-repo-name"
                      className="w-full bg-[#0c1017] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Create an empty repo on GitHub first (no README/license initialized).
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-mono text-slate-300">
                      GitHub Personal Access Token:
                    </label>
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=CommodiCast-AI-Studio"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
                    >
                      <span>Generate Token with 'repo' scope</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-[#0c1017] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">
                      Branch:
                    </label>
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full bg-[#0c1017] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">
                      Commit Message:
                    </label>
                    <input
                      type="text"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      className="w-full bg-[#0c1017] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>

                {pushError && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{pushError}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPushing}
                    className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-cyan-950/40 cursor-pointer disabled:opacity-50"
                  >
                    {isPushing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Pushing to GitHub...</span>
                      </>
                    ) : (
                      <>
                        <GitBranch className="w-4 h-4" />
                        <span>Sync & Push to GitHub</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Download ZIP */}
        {activeTab === 'download' && (
          <div className="mt-4 text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">
                Download Clean Codebase Archive (.zip)
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Download the complete codebase containing React 19, TypeScript, Tailwind v4, Vite, server endpoints, and Google Drive integrations.
              </p>
            </div>

            <button
              onClick={handleDownloadZip}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-cyan-950/50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download commodicast.zip</span>
            </button>

            <div className="bg-[#0c1017] border border-slate-800 rounded-xl p-3 text-left text-[11px] font-mono text-slate-400 space-y-1">
              <p className="text-slate-300 font-semibold mb-1">Push to GitHub via Terminal:</p>
              <p className="text-cyan-300">unzip commodicast.zip</p>
              <p className="text-cyan-300">git remote add origin https://github.com/USER/REPO.git</p>
              <p className="text-cyan-300">git push -u origin main</p>
            </div>
          </div>
        )}

        {/* Tab 3: Native AI Studio Export */}
        {activeTab === 'native' && (
          <div className="mt-4 p-4 rounded-xl bg-[#0c1017] border border-slate-800 space-y-3 text-xs leading-relaxed">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Built-in Google AI Studio GitHub Integration</span>
            </div>
            <p className="text-slate-300">
              You can also export this project directly to GitHub using AI Studio's native connection:
            </p>
            <ol className="space-y-2 list-decimal list-inside text-slate-400 font-mono text-[11px]">
              <li>
                Look at the top-right toolbar of the AI Studio window.
              </li>
              <li>
                Click on the <strong>Export</strong> or <strong>GitHub</strong> button.
              </li>
              <li>
                Authenticate with your GitHub account when prompted.
              </li>
              <li>
                Select or create the destination repository to link and sync automatically.
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};
