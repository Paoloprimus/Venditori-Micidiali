"use client";

import React from "react";

export default function ClientsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // logga sempre in console in prod
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[/clients] Client error boundary:", error);
  }, [error]);

  return (
    <div className="p-6 max-w-xl space-y-3">
      <h2 className="text-xl font-semibold">Si è verificato un errore in “Clienti”.</h2>
      <p className="text-sm text-gray-600">
        Messaggio: <code className="text-xs">{String(error?.message || "Errore sconosciuto")}</code>
      </p>
      {error?.stack ? (
        <details className="text-xs text-gray-500 whitespace-pre-wrap">
          <summary>Stack</summary>
          {error.stack}
        </details>
      ) : null}
      <button
        className="px-3 py-2 rounded border"
        onClick={() => reset()} // retry safe di Next.js
      >
        Riprova
      </button>
    </div>
  );
}
