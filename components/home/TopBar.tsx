"use client";
import React from "react";

type Props = {
  title: string;
  onOpenLeft: () => void;
  onOpenTop: () => void;
  onLogout: () => void;
};

export default function TopBar({ title, onOpenLeft, onOpenTop, onLogout }: Props) {
  return (
    <div className="topbar">
      <button className="iconbtn" aria-label="Apri conversazioni" onClick={onOpenLeft}>☰</button>
      <div className="title" style={{ flex: 1, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis" }}>
        {title}
      </div>
      <div className="spacer" />
      <button className="iconbtn" aria-label="Docs" onClick={onOpenTop}>⚙📁</button>
      <button className="iconbtn" onClick={onLogout}>Esci</button>
    </div>
  );
}
