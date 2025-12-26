'use client';
import React from 'react';
import { ProposalGenerator } from '@/components/ProposalGenerator';

export default function Page() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Generatore di Proposte</h1>
      <ProposalGenerator />
    </div>
  );
}
