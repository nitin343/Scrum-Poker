import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Toast } from '../components/Toast';

export function SettingsPage() {
    const { boardId } = useParams<{ boardId: string }>();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Form State
    const [projectContext, setProjectContext] = useState('');
    const [backendRepoUrl, setBackendRepoUrl] = useState('');
    const [frontendRepoUrl, setFrontendRepoUrl] = useState('');
    const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false
    });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type, isVisible: true });
    };

    useEffect(() => {
        if (!boardId) return;
        loadSettings();
    }, [boardId]);

    const loadSettings = async () => {
        if (!boardId) return;
        setIsLoading(true);
        try {
            const res = await api.ai.getBoardContext(boardId);
            if (res.success && res.data) {
                setProjectContext(res.data.projectContext || '');
                setBackendRepoUrl(res.data.backendRepoUrl || '');
                setFrontendRepoUrl(res.data.frontendRepoUrl || '');
                setLastAnalyzedAt(res.data.lastAnalyzedAt);
            }
        } catch (err) {
            console.error('Failed to load settings', err);
            showToast('Failed to load settings', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!boardId) return;
        setIsSaving(true);
        try {
            await api.ai.saveBoardContext(boardId, {
                projectContext,
                backendRepoUrl,
                frontendRepoUrl
            });
            showToast('Settings saved successfully', 'success');
        } catch (err) {
            console.error('Failed to save settings', err);
            showToast('Failed to save settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAnalyze = async () => {
        if (!boardId) return;

        // Save first ensuring newest data is used
        await handleSave();

        setIsAnalyzing(true);
        try {
            const res = await api.ai.analyzeCodebase(boardId);
            if (res.success) {
                showToast('Analysis completed successfully', 'success');
                setLastAnalyzedAt(new Date().toISOString());
            } else {
                showToast('Analysis failed', 'error');
            }
        } catch (err) {
            console.error('Failed to analyze codebase', err);
            showToast('Failed to analyze codebase', 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-animated text-white">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-animated p-8 overflow-y-auto">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                            AI Co-pilot Settings
                        </h1>
                        <p className="text-zinc-400 mt-2">Configure context to help the AI understand your project.</p>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 glass rounded-lg text-sm text-zinc-300 hover:text-white transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>

                {/* Main Content */}
                <div className="glass p-8 rounded-2xl border border-white/10 space-y-8">

                    {/* Project Context Section */}
                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-zinc-300 uppercase tracking-wider">
                            Project Context
                        </label>
                        <p className="text-xs text-zinc-500">
                            Describe your project's technology stack, coding conventions, and any specific business rules.
                            The AI will use this to generate more accurate estimates and reasoning.
                        </p>
                        <textarea
                            value={projectContext}
                            onChange={(e) => setProjectContext(e.target.value)}
                            className="w-full h-40 bg-black/30 border border-white/10 rounded-xl p-4 text-zinc-200 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                            placeholder="e.g. This is a React/Node.js application using MongoDB. We follow a microservices architecture..."
                        />
                    </div>

                    <div className="h-px bg-white/10" />

                    {/* Codebase Analysis Section */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-zinc-300 uppercase tracking-wider mb-2">
                                Codebase Integration
                            </label>
                            <p className="text-xs text-zinc-500 mb-4">
                                Provide links to your GitHub repositories. The AI can analyze structure and key files to map the architecture.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400">Backend Repository URL</label>
                                <input
                                    type="text"
                                    value={backendRepoUrl}
                                    onChange={(e) => setBackendRepoUrl(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                                    placeholder="https://github.com/org/repo-backend"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400">Frontend Repository URL</label>
                                <input
                                    type="text"
                                    value={frontendRepoUrl}
                                    onChange={(e) => setFrontendRepoUrl(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                                    placeholder="https://github.com/org/repo-frontend"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-cyan-500/10 rounded-lg">
                                    <span className="text-2xl">🧠</span>
                                </div>
                                <div>
                                    <div className="font-bold text-zinc-200">Codebase Mapping</div>
                                    <div className="text-xs text-zinc-500">
                                        {lastAnalyzedAt
                                            ? `Last analyzed: ${new Date(lastAnalyzedAt).toLocaleString()}`
                                            : 'Not analyzed yet'}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || (!backendRepoUrl && !frontendRepoUrl)}
                                className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2
                                    ${isAnalyzing
                                        ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/20'}
                                `}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <span>⚡ Analyze Now</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-white/10" />

                    {/* Actions */}
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`px-8 py-3 rounded-lg font-bold text-sm transition-all
                                ${isSaving
                                    ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                                    : 'bg-white text-black hover:bg-zinc-200'}
                            `}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
