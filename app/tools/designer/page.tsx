'use client';
import React, { useState } from 'react';
import { DBDesigner } from '../../../components/DBDesigner';

export default function Page() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Designer DB (voce/testo)</h1>
      <DBDesigner />
    </div>
  );
}
