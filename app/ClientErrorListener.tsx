"use client";

import React from "react";

export default function ClientErrorListener(): JSX.Element {
  React.useEffect(() => {
    const onErr = (ev: ErrorEvent) => {
      // eslint-disable-next-line no-console
      console.error("[global error]", ev.message, ev.error || "", ev.filename, ev.lineno, ev.colno);
    };
    const onRej = (ev: PromiseRejectionEvent) => {
      // eslint-disable-next-line no-console
      console.error("[unhandledrejection]", ev.reason);
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);
  return null;
}
