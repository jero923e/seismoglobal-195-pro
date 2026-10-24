import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  Phone,
  MessageCircle,
  Shield,
  Heart,
  AlertTriangle,
  Navigation,
  Clock,
  Share2,
  X,
} from 'lucide-react';

// ─── Interfaces ────────────────────────────────────────────────────────
export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  defaultLocation: 'casa' | 'colegio' | 'trabajo' | 'finca' | 'otro';
  status: 'safe' | 'moving' | 'needs_help';
  lastUpdated: string;
}

const STORAGE_KEY = 'seismoglobal_family_circle_v1';

const STATUS_CONFIG = {
  safe: { emoji: '🟢', label: 'A Salvo', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', btnBg: 'bg-emerald-600 hover:bg-emerald-500' },
  moving: { emoji: '🟡', label: 'En camino al Punto de Encuentro', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30', btnBg: 'bg-amber-600 hover:bg-amber-500' },
  needs_help: { emoji: '🔴', label: 'Necesita Asistencia', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', btnBg: 'bg-red-600 hover:bg-red-500' },
};

const RELATIONSHIP_EMOJIS: Record<string, string> = {
  'Mamá': '👩', 'Papá': '👨', 'Hermano/a': '👦', 'Abuelo/a': '👴',
  'Hijo/a': '🧒', 'Tío/a': '👤', 'Pareja': '💑', 'Primo/a': '👥', 'Otro': '👤',
};

const LOCATION_LABELS: Record<string, { emoji: string; label: string }> = {
  casa: { emoji: '🏠', label: 'Casa' },
  colegio: { emoji: '🎓', label: 'Colegio' },
  trabajo: { emoji: '💼', label: 'Trabajo' },
  finca: { emoji: '🌿', label: 'Finca' },
  otro: { emoji: '📍', label: 'Otro' },
};

// ─── Default Members ───────────────────────────────────────────────────
const DEFAULT_MEMBERS: FamilyMember[] = [
  {
    id: 'fam-1',
    name: 'María (Mamá)',
    relationship: 'Mamá',
    phone: '+57 300 123 4567',
    defaultLocation: 'trabajo',
    status: 'safe',
    lastUpdated: new Date(Date.now() - 1800_000).toISOString(),
  },
  {
    id: 'fam-2',
    name: 'Carlos (Papá)',
    relationship: 'Papá',
    phone: '+57 311 987 6543',
    defaultLocation: 'casa',
    status: 'safe',
    lastUpdated: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: 'fam-3',
    name: 'Sofía',
    relationship: 'Hermano/a',
    phone: '+57 320 555 1234',
    defaultLocation: 'colegio',
    status: 'moving',
    lastUpdated: new Date(Date.now() - 600_000).toISOString(),
  },
  {
    id: 'fam-4',
    name: 'Abuelita Rosa',
    relationship: 'Abuelo/a',
    phone: '+57 300 111 2222',
    defaultLocation: 'finca',
    status: 'safe',
    lastUpdated: new Date(Date.now() - 7200_000).toISOString(),
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────
function getSavedMembers(): FamilyMember[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MEMBERS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_MEMBERS;
    return parsed;
  } catch {
    return DEFAULT_MEMBERS;
  }
}

function saveMembers(members: FamilyMember[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  } catch { /* ignore */ }
}

function timeSince(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return 'Ahora';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

// ─── Component ─────────────────────────────────────────────────────────
export function FamilySafetyCircle() {
  const [members, setMembers] = useState<FamilyMember[]>(() => getSavedMembers());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState('Otro');
  const [newPhone, setNewPhone] = useState('');
  const [newLocation, setNewLocation] = useState<FamilyMember['defaultLocation']>('casa');

  useEffect(() => {
    saveMembers(members);
  }, [members]);

  const handleAddMember = () => {
    if (!newName.trim()) return;
    const member: FamilyMember = {
      id: `fam-${Date.now()}`,
      name: newName.trim(),
      relationship: newRelationship,
      phone: newPhone.trim(),
      defaultLocation: newLocation,
      status: 'safe',
      lastUpdated: new Date().toISOString(),
    };
    setMembers((prev) => [...prev, member]);
    setNewName('');
    setNewPhone('');
    setShowAddForm(false);
  };

  const handleDeleteMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleStatusChange = (id: string, status: FamilyMember['status']) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status, lastUpdated: new Date().toISOString() } : m
      )
    );
  };

  const handleShareWhatsApp = useCallback(() => {
    const lines = members.map((m) => {
      const statusCfg = STATUS_CONFIG[m.status];
      const locCfg = LOCATION_LABELS[m.defaultLocation];
      return `${statusCfg.emoji} ${m.name} (${m.relationship}) — ${statusCfg.label} — Ubicación habitual: ${locCfg.emoji} ${locCfg.label}`;
    });

    const text = encodeURIComponent(
      `🛡️ *Círculo Seguro — Estado Familiar Post-Sismo*\n` +
      `📅 ${new Date().toLocaleString()}\n\n` +
      lines.join('\n') +
      `\n\n📍 *Punto de Encuentro Acordado:* Lugar seguro más cercano (parque/cancha abierta).` +
      `\n\n— SeismoGlobal 195 Pro`
    );

    window.open(`https://wa.me/?text=${text}`, '_blank');
  }, [members]);

  const safeCount = members.filter((m) => m.status === 'safe').length;
  const movingCount = members.filter((m) => m.status === 'moving').length;
  const helpCount = members.filter((m) => m.status === 'needs_help').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-950/60 via-slate-900 to-slate-950 border border-sky-500/40 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-widest">
                Protección Familiar
              </div>
              <h3 className="text-lg font-black text-white">Red Familiar "Círculo Seguro"</h3>
            </div>
          </div>
        </div>

        {/* Status summary strip */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 text-xs font-bold">🟢 {safeCount} A Salvo</span>
          </div>
          <div className="w-px h-4 bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 text-xs font-bold">🟡 {movingCount} En camino</span>
          </div>
          <div className="w-px h-4 bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <span className="text-red-400 text-xs font-bold">🔴 {helpCount} Necesita ayuda</span>
          </div>
          <div className="flex-1" />
          <span className="text-[10px] text-slate-500 font-mono">{members.length} integrantes</span>
        </div>
      </div>

      {/* Member Cards */}
      <div className="space-y-2">
        {members.map((member) => {
          const statusCfg = STATUS_CONFIG[member.status];
          const locCfg = LOCATION_LABELS[member.defaultLocation];
          const relEmoji = RELATIONSHIP_EMOJIS[member.relationship] || '👤';

          return (
            <div
              key={member.id}
              className={`p-3 sm:p-4 rounded-2xl border ${statusCfg.bg} transition-all hover:scale-[1.003]`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lg">
                  {relEmoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-white truncate">{member.name}</span>
                    <span className="text-[10px] text-slate-500">({member.relationship})</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                    <span>{locCfg.emoji} {locCfg.label}</span>
                    {member.phone && (
                      <>
                        <span>•</span>
                        <Phone className="w-3 h-3" />
                        <span>{member.phone}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`text-[10px] font-bold ${statusCfg.color}`}>
                      {statusCfg.emoji} {statusCfg.label}
                    </span>
                    <span className="text-[10px] text-slate-600 ml-1">
                      — {timeSince(member.lastUpdated)}
                    </span>
                  </div>
                </div>

                {/* Quick status buttons */}
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(member.id, 'safe')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      member.status === 'safe'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700'
                    }`}
                  >
                    🟢
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(member.id, 'moving')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      member.status === 'moving'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-700'
                    }`}
                  >
                    🟡
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(member.id, 'needs_help')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      member.status === 'needs_help'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700'
                    }`}
                  >
                    🔴
                  </button>
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDeleteMember(member.id)}
                  className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-900 text-slate-500 hover:text-rose-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add member form */}
      {showAddForm ? (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-sky-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white">Agregar Integrante</h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre completo"
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
            />
            <select
              value={newRelationship}
              onChange={(e) => setNewRelationship(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
            >
              {Object.keys(RELATIONSHIP_EMOJIS).map((rel) => (
                <option key={rel} value={rel}>
                  {RELATIONSHIP_EMOJIS[rel]} {rel}
                </option>
              ))}
            </select>
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Teléfono (ej: +57 300...)"
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
            />
            <select
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value as FamilyMember['defaultLocation'])}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
            >
              {Object.entries(LOCATION_LABELS).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.emoji} {cfg.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddMember}
            disabled={!newName.trim()}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            Agregar al Círculo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:border-sky-500/30"
        >
          <Plus className="w-4 h-4" />
          Agregar Integrante al Círculo Seguro
        </button>
      )}

      {/* WhatsApp Share Button */}
      <button
        type="button"
        onClick={handleShareWhatsApp}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
      >
        <MessageCircle className="w-5 h-5" />
        Enviar Estado Familiar por WhatsApp
      </button>
    </div>
  );
}

export default FamilySafetyCircle;
