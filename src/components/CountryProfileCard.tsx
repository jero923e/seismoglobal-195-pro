import React from 'react';
import type { CountryProfile } from '../data/countries195';
import {
  ShieldAlert,
  PhoneCall,
  Landmark,
  Compass,
  ChevronRight,
  Info,
} from 'lucide-react';

interface CountryProfileCardProps {
  country: CountryProfile;
  onChangeCountryClick: () => void;
}

export const CountryProfileCard: React.FC<CountryProfileCardProps> = ({
  country,
  onChangeCountryClick,
}) => {
  const isCritical = country.riskLevel.includes('Crítico');
  const isHigh = country.riskLevel === 'Alto';

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 md:p-6 shadow-xl backdrop-blur-xl space-y-4">
      {/* Top Banner & Country Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3.5">
          <span className="text-4xl shadow-md rounded-2xl p-1 bg-slate-800/40">
            {country.flag}
          </span>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-white m-0 tracking-tight">
                {country.name}
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                {country.code}
              </span>
              <span className="text-xs font-medium text-slate-400">
                • {country.region}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Capital: <strong className="text-slate-200">{country.capital}</strong> • Radio de Cobertura: <strong className="text-cyan-400 font-mono">{country.maxradiuskm} km</strong>
            </p>
          </div>
        </div>

        <button
          onClick={onChangeCountryClick}
          className="self-start sm:self-center flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 transition-colors shadow-sm"
        >
          <span>Cambiar País (195)</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Key Technical Information Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Tectonic Plates */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] font-semibold">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Marco Tectónico</span>
          </div>
          <p className="font-semibold text-slate-200 text-xs leading-snug">
            {country.tectonicPlates}
          </p>
        </div>

        {/* Risk Level */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Nivel de Riesgo Sísmico</span>
          </div>
          <div>
            <span
              className={`inline-block font-black font-mono text-xs px-2 py-0.5 rounded-lg border ${
                isCritical
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : isHigh
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {country.riskLevel}
            </span>
          </div>
        </div>

        {/* Emergency Phone */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] font-semibold">
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
            <span>Teléfono de Emergencias</span>
          </div>
          <p className="font-mono font-bold text-emerald-300 text-sm">
            {country.emergencyPhone}
          </p>
        </div>

        {/* Official Agency */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] font-semibold">
            <Landmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Agencia Oficial</span>
          </div>
          <p className="font-semibold text-slate-200 text-xs truncate" title={country.agency}>
            {country.agency}
          </p>
        </div>
      </div>

      {/* Official Country Emergency Protocol */}
      <div className="rounded-2xl bg-cyan-950/20 border border-cyan-800/40 p-4 flex items-start space-x-3 text-xs text-slate-300">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block">
            Protocolo Oficial de Actuación Sísmica ({country.name}):
          </span>
          <p className="mt-0.5 leading-relaxed text-slate-300">
            {country.protocol}
          </p>
        </div>
      </div>
    </div>
  );
};
