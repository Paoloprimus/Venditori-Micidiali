import React from "react";

type PageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function ChatSessionPage({ params }: PageProps) {
  const { id } = params;

  return (
    <main style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 8 }}>Chat</h1>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>
        Sessione: <code>{id}</code>
      </p>

      {/* Placeholder: qui collegheremo i messaggi e l’input */}
      <div
        style={{
          border: "1px solid #333",
          borderRadius: 12,
          padding: 16,
          minHeight: 200,
        }}
      >
        <p>Placeholder conversazione. La pagina ora esiste (niente più 404).</p>
      </div>
    </main>
  );
}
