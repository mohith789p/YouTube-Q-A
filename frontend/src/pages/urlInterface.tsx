import React, { useState } from 'react';
import { Loader2, PlaySquare, AlertCircle, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface UrlIngestionProps {
  onIngest: (url: string) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
}

export const UrlIngestion: React.FC<UrlIngestionProps> = ({
  onIngest,
  isLoading,
  errorMessage: externalError,
}) => {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const isValidYouTubeUrl = (inputUrl: string): boolean => {
    try {
      const parsedUrl = new URL(inputUrl);
      const hostname = parsedUrl.hostname.toLowerCase();

      const validHostnames = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'];
      if (!validHostnames.includes(hostname)) {
        return false;
      }

      if (
        !['http:', 'https:'].includes(parsedUrl.protocol) ||
        parsedUrl.username ||
        parsedUrl.password ||
        parsedUrl.port
      ) {
        return false;
      }

      let videoId: string | null = null;

      if (hostname === 'youtu.be') {
        const cleanPath = parsedUrl.pathname.replace(/^\//, '').replace(/\/$/, '');
        videoId = cleanPath.split('/')[0] || null;
      } else if (parsedUrl.pathname === '/watch') {
        videoId = parsedUrl.searchParams.get('v');
      } else if (parsedUrl.pathname.startsWith('/shorts/')) {
        const cleanPath = parsedUrl.pathname.replace(/^\/shorts\//, '').replace(/\/$/, '');
        videoId = cleanPath.split('/')[0] || null;
      } else if (parsedUrl.pathname.startsWith('/embed/')) {
        const cleanPath = parsedUrl.pathname.replace(/^\/embed\//, '').replace(/\/$/, '');
        videoId = cleanPath.split('/')[0] || null;
      }

      return videoId !== null && /^[a-zA-Z0-9_-]{11}$/.test(videoId);
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setValidationError('Please enter a YouTube video URL.');
      return;
    }
    if (!isValidYouTubeUrl(trimmedUrl)) {
      setValidationError(
        'Invalid YouTube URL. Please provide a valid link (e.g., https://youtube.com/watch?v=...)'
      );
      return;
    }
    await onIngest(trimmedUrl);
  };

  const activeError = validationError || externalError;

  return (
    <div className="w-full h-full flex-1 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative Gradient Glow */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-72 bg-red-500/10 dark:bg-red-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-2xl flex flex-col">

        {/* Header Branding */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>RAG Engine Ready</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-lg shadow-red-500/20">
              <PlaySquare className="w-7 h-7" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              YouTube Q&A
            </h1>
          </div>

          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            Extract transcripts from any video in seconds to start asking targeted, context-aware questions.
          </p>
        </div>

        {/* URL Input Form Card */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-2xl p-4 sm:p-6 shadow-xl shadow-gray-200/50 dark:shadow-none transition-all">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label htmlFor="youtube-url" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">
              Video Location
            </label>

            <div className="relative flex items-center">
              <input
                id="youtube-url"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={isLoading}
                className="w-full px-4 py-3.5 pl-11 pr-36 text-sm text-gray-900 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white dark:focus:bg-gray-900 dark:text-white disabled:opacity-60 transition-all shadow-inner"
              />
              <PlaySquare className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none" />

              {/* Extract Button with Circulating Loader */}
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-80 disabled:cursor-not-allowed disabled:transform-none transition-all flex items-center gap-2 shadow-md shadow-red-600/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <span>Extract</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Dynamic Inline Error Container */}
            {activeError && (
              <div className="flex items-start gap-3 p-4 text-sm text-red-900 bg-red-500/10 border border-red-500/20 rounded-xl dark:text-red-300 animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold block mb-0.5">Extraction Error</span>
                  <p className="text-xs sm:text-sm text-red-700 dark:text-red-300/90 leading-normal">
                    {activeError}
                  </p>
                </div>
              </div>
            )}
          </form>

          {/* Feature Badges Footer */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Auto Captions & Subtitles
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              LangChain Vector Search
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UrlIngestion;