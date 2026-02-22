/**
 * Ultimate XI SBC & Formation Engine (F38 Final)
 * Multi-formation squad builder with SBC validation, chemistry links, and requirement HUD.
 */

import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTrashAlt, FaSpinner, FaTimes, FaCheck, FaTrophy, FaChevronDown } from 'react-icons/fa';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import Breadcrumb from '../components/Breadcrumb';
import TeamLogo from '../components/TeamLogo';
import {
  FORMATIONS,
  FORMATION_CATEGORIES,
  FORMATION_DISPLAY_NAMES,
  POS_TO_DB_POSITION,
  DEFAULT_FORMATION_ID,
} from '../constants/formations';
import { validateSBC, SBC_REQUIREMENTS } from '../utils/sbcValidation';

const BUDGET_CAP = 500_000_000;

/** Build empty formation state for a formation id */
function getEmptyFormation(formationId) {
  const formation = FORMATIONS[formationId];
  if (!formation) return {};
  return Object.fromEntries(Object.keys(formation.slots).map((slot) => [slot, null]));
}

/**
 * When switching formations: keep players whose slot id exists in the new formation;
 * if a slot no longer exists (e.g. LW in 4-3-3 → 4-4-2), that player is cleared and effectively returned to pool.
 */
function mergeFormationOnSwitch(prevFormation, _prevFormationId, newFormationId) {
  const nextForm = FORMATIONS[newFormationId];
  if (!nextForm) return getEmptyFormation(newFormationId);
  const nextSlots = nextForm.slots;
  const nextState = {};
  for (const slot of Object.keys(nextSlots)) {
    nextState[slot] = prevFormation[slot] ?? null;
  }
  return nextState;
}

// Trading-card slot: glassmorphism, position from normalized coords; layout animates on formation change
const PlayerSlot = memo(({ slot, player, pos, openModal, removePlayer }) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal(slot);
    }
  };
  const ariaLabel = player
    ? `${player.player_name ?? 'Player'} in ${slot}`
    : `Empty position ${slot}. Add player`;
  const lastName = player?.player_name?.split(' ').pop() || player?.player_name || '';

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className="absolute cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00FF85] focus-visible:ring-offset-2 focus-visible:ring-offset-[#047857]"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: 'translate(-50%, -50%)',
        width: 'clamp(44px, 10vw, 72px)',
        minWidth: 44,
        maxWidth: 72,
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={() => openModal(slot)}
    >
      {player ? (
        <div className="relative w-full rounded-lg border border-white/10 bg-black/40 shadow-lg backdrop-blur-md transition hover:border-[#00FF85]/50 hover:bg-black/50">
          <div className="absolute left-0.5 top-0.5 z-10 rounded bg-[#00FF85]/90 px-1 font-heading text-[9px] font-bold text-gray-900 md:text-[10px]">
            {player.sofascore_rating != null ? Number(player.sofascore_rating).toFixed(1) : '–'}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removePlayer(slot);
            }}
            className="absolute -top-0.5 -right-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:h-5 md:w-5"
            aria-label={`Remove ${player.player_name ?? 'player'} from ${slot}`}
          >
            <FaTimes className="h-2 w-2 md:h-2.5 md:w-2.5" />
          </button>
          <div className="aspect-[3/4] w-full overflow-hidden rounded-t-md bg-white/10">
            {player.image_url || player.photo_url ? (
              <img src={player.image_url || player.photo_url} alt="" className="h-full w-full object-cover" />
            ) : player.logo_url || player.team_logo ? (
              <TeamLogo logoUrl={player.logo_url || player.team_logo} teamName={player.team_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-700/80 text-white">
                <span className="font-body text-lg font-medium md:text-xl">{player.player_name?.charAt(0) || '?'}</span>
              </div>
            )}
          </div>
          <div className="rounded-b-md border-t border-white/10 bg-black/30 px-0.5 py-1">
            <span className="block truncate text-center text-[9px] font-body font-medium text-white md:text-[10px]">{lastName}</span>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col items-center justify-center rounded-lg border border-white/10 bg-black/40 py-4 backdrop-blur-md shadow transition hover:border-[#00FF85]/40 hover:bg-black/50 md:py-5">
          <FaPlus className="text-sm text-white/80 md:text-base" />
          <span className="mt-1.5 text-[9px] font-body font-medium text-white/90 md:text-[10px]">{slot}</span>
        </div>
      )}
    </motion.div>
  );
});
PlayerSlot.displayName = 'PlayerSlot';

/** Categorized, searchable formation dropdown with framer-motion */
const FormationSelector = memo(({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byCategory = {};
    for (const [cat, ids] of Object.entries(FORMATION_CATEGORIES)) {
      const list = q
        ? ids.filter(
            (id) =>
              (FORMATION_DISPLAY_NAMES[id] || id).toLowerCase().includes(q) ||
              id.toLowerCase().includes(q)
          )
        : ids;
      if (list.length) byCategory[cat] = list;
    }
    return byCategory;
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    if (open) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [open]);

  const displayName = FORMATION_DISPLAY_NAMES[value] || value;
  const categoryLabels = {
    '4-at-the-back': '4 at the back',
    '3-at-the-back': '3 at the back',
    '5-at-the-back': '5 at the back',
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-3 font-body text-sm font-medium text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF85] disabled:opacity-50"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select formation"
      >
        <span className="truncate">{displayName}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-white/70"
        >
          <FaChevronDown className="h-4 w-4" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[70vmin] w-full overflow-hidden rounded-xl border border-white/20 bg-[#1a1a1a] shadow-xl"
          >
            <div className="sticky top-0 border-b border-white/10 bg-[#1a1a1a] p-2">
              <input
                type="text"
                placeholder="Search formations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 font-body text-sm text-white placeholder:text-white/50 focus:border-[#00FF85] focus:outline-none"
                aria-label="Search formations"
              />
            </div>
            <ul
              className="max-h-[60vmin] overflow-y-auto p-2"
              role="listbox"
              aria-label="Formation options"
            >
              {Object.entries(filtered).map(([cat, ids]) => (
                <li key={cat} className="mb-2">
                  <p className="mb-1 px-2 py-0.5 text-xs font-heading font-semibold uppercase tracking-wider text-[#00FF85]/90">
                    {categoryLabels[cat] || cat}
                  </p>
                  <ul className="space-y-0.5">
                    {ids.map((id) => (
                      <li key={id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={value === id}
                          onClick={() => {
                            onChange(id);
                            setOpen(false);
                            setSearch('');
                          }}
                          className={`w-full rounded-lg px-3 py-2 text-left font-body text-sm transition ${
                            value === id
                              ? 'bg-[#00FF85]/20 text-[#00FF85]'
                              : 'text-white/90 hover:bg-white/10'
                          }`}
                        >
                          {FORMATION_DISPLAY_NAMES[id] || id}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
              {Object.keys(filtered).length === 0 && (
                <li className="py-4 text-center font-body text-sm text-white/50">
                  No formations match &quot;{search}&quot;
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
FormationSelector.displayName = 'FormationSelector';

function formatCurrency(value) {
  if (value == null || isNaN(value)) return '£0';
  const num = Number(value);
  if (num >= 1_000_000) {
    return `£${(num / 1_000_000).toFixed(0)}m`;
  }
  if (num >= 1_000) {
    return `£${(num / 1_000).toFixed(1)}k`;
  }
  return `£${num.toFixed(0)}`;
}

const SquadBuilder = () => {
  const [currentFormationId, setCurrentFormationId] = useState(DEFAULT_FORMATION_ID);
  const [formation, setFormation] = useState(() => getEmptyFormation(DEFAULT_FORMATION_ID));
  const [modalSlot, setModalSlot] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const currentFormation = FORMATIONS[currentFormationId] || FORMATIONS[DEFAULT_FORMATION_ID];
  const formationSlots = useMemo(() => Object.keys(currentFormation.slots), [currentFormation]);

  const searchedAndFilteredPlayers = useMemo(() => {
    if (!modalSlot || !currentFormation.slotPos) return [];
    const role = currentFormation.slotPos[modalSlot];
    const position = POS_TO_DB_POSITION[role] || 'Midfielder';
    let list = allPlayers.filter((p) => p.position === position);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          (p.player_name && p.player_name.toLowerCase().includes(q)) ||
          (p.team_name && p.team_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allPlayers, modalSlot, searchQuery, currentFormation]);

  const topFiveByPosition = useMemo(() => {
    if (!modalSlot || !currentFormation.slotPos) return [];
    const role = currentFormation.slotPos[modalSlot];
    const position = POS_TO_DB_POSITION[role] || 'Midfielder';
    return allPlayers
      .filter((p) => p.position === position && p.sofascore_rating != null)
      .sort((a, b) => (parseFloat(b.sofascore_rating) || 0) - (parseFloat(a.sofascore_rating) || 0))
      .slice(0, 5);
  }, [allPlayers, modalSlot, currentFormation]);

  const modalPlayerList = useMemo(() => {
    if (searchQuery.trim()) return searchedAndFilteredPlayers;
    return topFiveByPosition;
  }, [searchQuery, searchedAndFilteredPlayers, topFiveByPosition]);

  const selectedPlayers = useMemo(
    () => Object.values(formation).filter(Boolean),
    [formation]
  );

  const sbcResult = useMemo(() => validateSBC(formation), [formation]);

  const chemistryLinks = useMemo(() => {
    const links = [];
    const slots = currentFormation.slots;
    const adj = currentFormation.adjacency || [];
    for (const [a, b] of adj) {
      const playerA = formation[a];
      const playerB = formation[b];
      if (!playerA || !playerB) continue;
      const clubA = (playerA.team_name && String(playerA.team_name).trim()) || '';
      const clubB = (playerB.team_name && String(playerB.team_name).trim()) || '';
      if (clubA && clubA === clubB) {
        links.push({
          x1: slots[a].x,
          y1: slots[a].y,
          x2: slots[b].x,
          y2: slots[b].y,
        });
      }
    }
    return links;
  }, [currentFormation, formation]);
  const usedPlayerIds = useMemo(
    () => new Set(selectedPlayers.map((p) => p.id)),
    [selectedPlayers]
  );

  const currentSpend = useMemo(
    () =>
      selectedPlayers.reduce(
        (sum, p) => sum + (Number(p.market_value) || 0),
        0
      ),
    [selectedPlayers]
  );

  const averageRating = useMemo(() => {
    if (selectedPlayers.length === 0) return null;
    const sum = selectedPlayers.reduce(
      (acc, p) => acc + (parseFloat(p.sofascore_rating) || 0),
      0
    );
    return sum / selectedPlayers.length;
  }, [selectedPlayers]);

  const totalOutput = useMemo(
    () =>
      selectedPlayers.reduce(
        (acc, p) =>
          acc + (Number(p.goals) || 0) + (Number(p.assists) || 0),
        0
      ),
    [selectedPlayers]
  );

  const radarData = useMemo(() => {
    if (selectedPlayers.length === 0) return [];
    const n = selectedPlayers.length;
    const sum = (key) =>
      selectedPlayers.reduce(
        (acc, p) => acc + (Number(p[key]) || 0),
        0
      );
    const avg = (key) => (n ? sum(key) / n : 0);
    const maxVals = { goals: 25, xg: 20, assists: 15, xag: 12, progressive_passes: 150, rating: 10 };
    const norm = (v, max) => (max ? Math.min((v / max) * 100, 100) : 0);
    const avgRating = selectedPlayers.reduce((a, p) => a + (parseFloat(p.sofascore_rating) || 0), 0) / n;
    return [
      {
        subject: 'Attacking',
        value: Math.round(norm(avg('goals') + avg('xg'), maxVals.goals + maxVals.xg)),
        fullMark: 100,
      },
      {
        subject: 'Playmaking',
        value: Math.round(norm(avg('assists') + avg('xag') + avg('progressive_passes') / 10, maxVals.assists + maxVals.xag + 15)),
        fullMark: 100,
      },
      {
        subject: 'Defending',
        value: Math.round(norm(avgRating, maxVals.rating)), // rating 0–10 → 0–100
        fullMark: 100,
      },
    ];
  }, [selectedPlayers]);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/players');
        if (!res.ok) throw new Error('Failed to fetch players');
        const json = await res.json();
        setAllPlayers(json.data || []);
      } catch (err) {
        setError(err.message);
        setAllPlayers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  const openModal = useCallback((slot) => setModalSlot(slot), []);
  const closeModal = useCallback(() => {
    setModalSlot(null);
    setSearchQuery('');
  }, []);

  const removePlayer = useCallback((slot) => {
    setFormation((prev) => ({ ...prev, [slot]: null }));
  }, []);

  const addPlayer = (player) => {
    if (usedPlayerIds.has(player.id)) return;
    if (!modalSlot) return;
    const value = Number(player.market_value) || 0;
    const spendIfAdded = currentSpend - (Number(formation[modalSlot]?.market_value) || 0) + value;
    if (spendIfAdded > BUDGET_CAP) return;
    setFormation((prev) => ({ ...prev, [modalSlot]: player }));
    closeModal();
  };

  const clearSquad = useCallback(() => {
    setFormation(getEmptyFormation(currentFormationId));
  }, [currentFormationId]);

  const changeFormation = useCallback((id) => {
    if (id === currentFormationId) return;
    setFormation((prev) => mergeFormationOnSwitch(prev, currentFormationId, id));
    setCurrentFormationId(id);
    setModalSlot(null);
  }, [currentFormationId]);

  const handleSubmit = useCallback(() => {
    if (!sbcResult.valid) return;
    setShowCelebration(true);
  }, [sbcResult.valid]);

  const isOverBudget = currentSpend > BUDGET_CAP;
  const isSquadFull = selectedPlayers.length === 11;

  return (
    <div className="min-h-screen">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Ultimate XI Squad Builder' }]} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-heading font-bold text-white tracking-tight">
          Ultimate XI Squad Builder
        </h1>
        <button
          type="button"
          onClick={clearSquad}
          className="font-body inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <FaTrashAlt /> Clear Squad
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 font-body text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Pitch */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="font-body text-sm font-medium text-white/80">Formation</span>
            <FormationSelector
              value={currentFormationId}
              onChange={changeFormation}
              disabled={false}
            />
          </div>
          <div
            className="relative w-full overflow-hidden rounded-xl border-2 border-white/20 shadow-xl aspect-[3/2] min-h-[260px] max-h-[90vmin] max-md:max-h-[55vmin] md:min-h-[320px]"
            style={{ contain: 'layout' }}
          >
            <div className="absolute inset-0 pt-4 pb-4">
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(165deg, #064e3b 0%, #047857 30%, #059669 50%, #047857 70%, #064e3b 100%)',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/30 via-transparent to-emerald-900/30" />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(0,0,0,0.35) 100%)',
                }}
              />
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
                <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeWidth="0.4" opacity="0.9" />
                <circle cx="50" cy="50" r="16" fill="none" stroke="white" strokeWidth="0.4" opacity="0.9" />
                <circle cx="50" cy="50" r="0.6" fill="white" opacity="0.9" />
                <rect x="30" y="72" width="40" height="28" fill="none" stroke="white" strokeWidth="0.4" opacity="0.9" />
                <rect x="41" y="82" width="18" height="18" fill="none" stroke="white" strokeWidth="0.4" opacity="0.9" />
                <circle cx="50" cy="91" r="0.6" fill="white" opacity="0.9" />
                <rect x="30" y="0" width="40" height="28" fill="none" stroke="white" strokeWidth="0.4" opacity="0.9" />
                <rect x="41" y="0" width="18" height="18" fill="none" stroke="white" strokeWidth="0.4" opacity="0.9" />
                <circle cx="50" cy="9" r="0.6" fill="white" opacity="0.9" />
              </svg>
              {/* Chemistry links: neon green between same-club adjacent slots */}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
                {chemistryLinks.map((link, i) => (
                  <line
                    key={i}
                    x1={link.x1}
                    y1={link.y1}
                    x2={link.x2}
                    y2={link.y2}
                    stroke="#00FF85"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    opacity="0.9"
                    style={{ filter: 'drop-shadow(0 0 4px #00FF85)' }}
                  />
                ))}
              </svg>
              <AnimatePresence mode="popLayout">
                {formationSlots.map((slot) => (
                  <PlayerSlot
                    key={slot}
                    slot={slot}
                    player={formation[slot]}
                    pos={currentFormation.slots[slot]}
                    openModal={openModal}
                    removePlayer={removePlayer}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right: Analytics */}
        <div className="space-y-4 font-body">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <h2 className="mb-4 text-sm font-heading font-semibold uppercase tracking-wider text-white/70">
              Squad Analytics
            </h2>
            {/* KPI: Total Spend — massive + progress bar */}
            <div className="mb-5">
              <p className="mb-1 text-xs text-white/60">Total Spend</p>
              <p
                className={`font-heading text-3xl font-bold sm:text-4xl md:text-5xl ${isOverBudget ? 'text-red-400' : 'text-[#00FF85]'}`}
              >
                {formatCurrency(currentSpend)}
                <span className="ml-1 text-xl font-semibold text-white/70 sm:text-2xl md:text-3xl">
                  / {formatCurrency(BUDGET_CAP)}
                </span>
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: isOverBudget
                      ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                      : 'linear-gradient(90deg, #00FF85, #00cc6a)',
                    boxShadow: isOverBudget ? 'none' : '0 0 12px rgba(0,255,133,0.5)',
                  }}
                  initial={false}
                  animate={{ width: `${Math.min(100, (currentSpend / BUDGET_CAP) * 100)}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
              </div>
            </div>
            {/* KPI: Average Rating — massive */}
            <div className="mb-4">
              <p className="mb-1 text-xs text-white/60">Average Squad Rating</p>
              <p className="font-heading text-3xl font-bold text-white sm:text-4xl md:text-5xl">
                {averageRating != null ? averageRating.toFixed(1) : '–'}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60">Total Output (G+A)</p>
              <p className="font-heading text-xl font-bold text-white md:text-2xl">
                {totalOutput}
              </p>
            </div>
          </div>

          {/* SBC Requirement HUD */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <h2 className="mb-3 text-sm font-heading font-semibold uppercase tracking-wider text-white/80">
              SBC Requirements
            </h2>
            <ul className="space-y-2 font-body text-sm">
              <li className="flex items-center gap-2">
                {sbcResult.requirements.rating.met ? (
                  <FaCheck className="h-4 w-4 shrink-0 text-[#00FF85]" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border-2 border-red-400" />
                )}
                <span className={sbcResult.requirements.rating.met ? 'text-white/90' : 'text-red-300'}>
                  Avg Rating ≥ {SBC_REQUIREMENTS.minRating} ({sbcResult.requirements.rating.value})
                </span>
              </li>
              <li className="flex items-center gap-2">
                {sbcResult.requirements.marketValue.met ? (
                  <FaCheck className="h-4 w-4 shrink-0 text-[#00FF85]" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border-2 border-red-400" />
                )}
                <span className={sbcResult.requirements.marketValue.met ? 'text-white/90' : 'text-red-300'}>
                  Value ≤ £300m ({formatCurrency(sbcResult.requirements.marketValue.value)})
                </span>
              </li>
              <li className="flex items-center gap-2">
                {sbcResult.requirements.nationalities.met ? (
                  <FaCheck className="h-4 w-4 shrink-0 text-[#00FF85]" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border-2 border-red-400" />
                )}
                <span className={sbcResult.requirements.nationalities.met ? 'text-white/90' : 'text-red-300'}>
                  Min {SBC_REQUIREMENTS.minNationalities} nationalities ({sbcResult.requirements.nationalities.count})
                </span>
              </li>
              <li className="flex items-center gap-2">
                {sbcResult.requirements.sameClub.met ? (
                  <FaCheck className="h-4 w-4 shrink-0 text-[#00FF85]" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border-2 border-red-400" />
                )}
                <span className={sbcResult.requirements.sameClub.met ? 'text-white/90' : 'text-red-300'}>
                  Max {SBC_REQUIREMENTS.maxPlayersPerClub} per club (max: {sbcResult.requirements.sameClub.worst})
                </span>
              </li>
            </ul>
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={!sbcResult.valid}
              className={`mt-4 w-full rounded-lg py-3 font-body text-base font-bold transition flex items-center justify-center gap-2 ${
                sbcResult.valid
                  ? 'bg-[#00FF85] text-gray-900 shadow-[0_0_20px_rgba(0,255,133,0.5)]'
                  : 'cursor-not-allowed bg-white/10 text-white/50'
              }`}
              style={
                sbcResult.valid
                  ? {
                      background: 'linear-gradient(135deg, #00FF85 0%, #00cc6a 50%, #00FF85 100%)',
                      boxShadow: '0 0 24px rgba(0,255,133,0.6), 0 0 48px rgba(0,255,133,0.3)',
                    }
                  : undefined
              }
              whileHover={sbcResult.valid ? { scale: 1.02 } : undefined}
              whileTap={sbcResult.valid ? { scale: 0.98 } : undefined}
            >
              <FaTrophy className="h-5 w-5" />
              Submit SBC
            </motion.button>
          </div>

          {radarData.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <h2 className="mb-3 text-lg font-heading font-semibold text-white">
                Team Radar
              </h2>
              <div
                className="h-48 min-h-[200px] w-full sm:h-52 md:h-56"
                style={{ filter: 'drop-shadow(0 0 8px rgba(0,255,133,0.25))' }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.25)" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#e5e7eb', fontSize: 10 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9 }}
                    />
                    <Radar
                      name="Squad"
                      dataKey="value"
                      stroke="#00FF85"
                      fill="#00FF85"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Player Search Modal */}
      <AnimatePresence>
        {modalSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-white/20 bg-[#1a1a1a] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <h3 className="font-heading text-lg font-semibold text-white">
                  Select player for {modalSlot}
                  {currentFormation.slotPos?.[modalSlot] && (
                    <span className="ml-2 font-body text-sm font-normal text-white/60">
                      ({POS_TO_DB_POSITION[currentFormation.slotPos[modalSlot]]} only)
                    </span>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Close player search"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="border-b border-white/10 px-4 py-2">
                <input
                  type="text"
                  placeholder="Search by name or club..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="font-body w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/50 focus:border-[#00FF85] focus:outline-none"
                  aria-label="Search players by name or club"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <FaSpinner className="animate-spin text-2xl text-[#00FF85]" />
                  </div>
                ) : modalPlayerList.length === 0 ? (
                  <p className="font-body py-6 text-center text-white/60">
                    {searchQuery.trim() ? 'No players found for this position.' : 'No players with rating for this position.'}
                  </p>
                ) : (
                  <>
                    {!searchQuery.trim() && (
                      <p className="mb-2 px-1 text-xs font-body font-medium text-white/60">
                        Top 5 by rating
                      </p>
                    )}
                    <ul className="space-y-1">
                      {modalPlayerList.map((player) => {
                        const usedElsewhere = usedPlayerIds.has(player.id) && formation[modalSlot]?.id !== player.id;
                        const value = Number(player.market_value) || 0;
                        const wouldExceed =
                          currentSpend - (Number(formation[modalSlot]?.market_value) || 0) + value > BUDGET_CAP;
                        const canAdd = !usedElsewhere && !wouldExceed;
                        return (
                          <li key={player.id}>
                            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <TeamLogo
                                  logoUrl={player.logo_url || player.team_logo}
                                  teamName={player.team_name}
                                  className="h-10 w-10 shrink-0 object-contain"
                                />
                                <div className="min-w-0">
                                  <p className="truncate font-body font-medium text-white">
                                    {player.player_name}
                                  </p>
                                  <p className="text-xs text-white/60">
                                    {formatCurrency(player.market_value)} · Rating{' '}
                                    {player.sofascore_rating != null
                                      ? Number(player.sofascore_rating).toFixed(1)
                                      : '–'}
                                  </p>
                                </div>
                              </div>
                              <motion.button
                                type="button"
                                disabled={!canAdd}
                                onClick={() => canAdd && addPlayer(player)}
                                whileHover={canAdd ? { scale: 1.05 } : undefined}
                                whileTap={canAdd ? { scale: 0.98 } : undefined}
                                className="shrink-0 rounded-lg bg-[#00FF85] px-3 py-1.5 font-body text-sm font-semibold text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {usedElsewhere ? 'In squad' : wouldExceed ? 'Over budget' : 'Add'}
                              </motion.button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen celebration on SBC submit */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md"
            onClick={() => setShowCelebration(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="text-center px-6"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              >
                <FaTrophy className="mx-auto h-24 w-24 text-[#00FF85] drop-shadow-[0_0_30px_rgba(0,255,133,0.8)]" />
              </motion.div>
              <h2 className="mt-6 font-heading text-4xl font-bold text-white md:text-5xl">
                SBC Complete!
              </h2>
              <p className="mt-2 font-body text-lg text-white/80">
                You've met all requirements. Ultimate XI unlocked.
              </p>
              <motion.button
                type="button"
                onClick={() => setShowCelebration(false)}
                className="mt-8 rounded-xl bg-[#00FF85] px-8 py-3 font-body text-lg font-bold text-gray-900 shadow-[0_0_30px_rgba(0,255,133,0.5)]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Continue
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SquadBuilder;
