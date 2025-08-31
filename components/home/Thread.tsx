"use client";
import React, { RefObject } from "react";

type Bubble = { role: "user" | "assistant"; content: string };

type Props = {
  bubbles: Bubble[];
  serverError?: string | null;
  threadRef?: RefObject<HTMLDivElement>;
  endRef?: RefObject<HTMLDivElement>; // ✅ nuovo: sentinel per autoscroll
};

export default function Thread({ bubbles, serverError, threadRef, endRef }: Props) {
  return (
    <div className="thread" ref={threadRef}>
      {bubbles.length === 0 && (
        <div className="helper">Nessun messaggio ancora. Scrivi qui sotto per iniziare.</div>
      )}
      {bubbles.map((m, i) => (
        <div key={i} className={`msg ${m.role === "user" ? "me" : ""}`}>
          {m.content}
        </div>
      ))}
      {serverError && <div className="helper" style={{ color: "#F59E0B" }}>Errore LLM: {serverError}</div>}

      {/* ✅ sentinel: sempre alla fine del thread */}
      <div ref={endRef} style={{ height: 150 }} />
    </div>
  );
}
