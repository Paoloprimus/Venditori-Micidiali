"use client";
import React, { RefObject } from "react";
import PromemoriaWidget from './PromemoriaWidget';

type Bubble = { role: "user" | "assistant"; content: string };

type Props = {
  bubbles: Bubble[];
  serverError?: string | null;
  threadRef?: RefObject<HTMLDivElement>;
  endRef?: RefObject<HTMLDivElement>;
  onOpenDrawer?: () => void; // ✅ nuovo
};

export default function Thread({ bubbles, serverError, threadRef, endRef, onOpenDrawer }: Props) {
  return (
    <div className="thread" ref={threadRef}>
      {bubbles.length === 0 && (
        <PromemoriaWidget onOpenDrawer={onOpenDrawer} />
      )}
      {bubbles.map((m, i) => (
        <div key={i} className={`msg ${m.role === "user" ? "me" : ""}`}>
          {m.content}
        </div>
      ))}
      {serverError && <div className="helper" style={{ color: "#F59E0B" }}>Errore LLM: {serverError}</div>}
      <div ref={endRef} style={{ height: 150 }} />
    </div>
  );
}
