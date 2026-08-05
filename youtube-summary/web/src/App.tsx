import { useState } from "react";
import { analyzeVideo, ApiError } from "./api/client";
import { ChatPanel } from "./components/ChatPanel";
import { UrlForm } from "./components/UrlForm";
import { VideoSummary } from "./components/VideoSummary";
import { AnalyzeResponse } from "./types/analysis";

export default function App() {
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(url: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await analyzeVideo(url);
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Résumé YouTube IA</h1>
        <p>Résumé, note de fiabilité et chat sur n'importe quelle vidéo YouTube sous-titrée.</p>
      </header>

      <UrlForm onSubmit={handleSubmit} loading={loading} />

      {error && <p className="global-error">{error}</p>}
      {loading && <p className="loading-hint">Récupération du transcript et analyse par l'IA…</p>}

      {result && (
        <main className="results">
          <VideoSummary result={result} />
          <ChatPanel sessionId={result.sessionId} videoTitle={result.title} />
        </main>
      )}
    </div>
  );
}
