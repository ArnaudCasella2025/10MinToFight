import { FormEvent, useState } from "react";

interface Props {
  onSubmit: (url: string) => void;
  loading: boolean;
}

export function UrlForm({ onSubmit, loading }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim() || loading) return;
    onSubmit(value.trim());
  }

  return (
    <form className="url-form" onSubmit={handleSubmit}>
      <input
        type="url"
        inputMode="url"
        placeholder="Collez un lien YouTube (https://www.youtube.com/watch?v=...)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={loading}
        required
      />
      <button type="submit" disabled={loading || !value.trim()}>
        {loading ? "Analyse en cours…" : "Analyser"}
      </button>
    </form>
  );
}
