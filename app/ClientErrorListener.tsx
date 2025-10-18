
"use client";
import React from "react";

export default function ClientErrorListener(): React.ReactNode {
  React.useEffect(() => {
    const onErr = (ev: ErrorEvent) => {
      console.error("[global error]", ev.message, ev.error || "", ev.filename, ev.lineno, ev.colno);
    };
    const onRej = (ev: PromiseRejectionEvent) => {
      console.error("[unhandledrejection]", ev.reason);
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  return null; // ora è valido perché ReactNode include null
}
