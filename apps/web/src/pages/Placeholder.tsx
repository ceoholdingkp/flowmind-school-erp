import React from 'react';
import { Construction } from 'lucide-react';

interface Props { title: string; }

export default function Placeholder({ title }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="p-4 bg-[#1a2332] border border-[#2a3a4a] rounded-2xl mb-4">
        <Construction size={32} className="text-[#f59e0b]" />
      </div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="text-[#8899aa] text-sm mt-2">Módulo disponible próximamente</p>
    </div>
  );
}
