/**
 * FC 25 Formation coordinate system for SBC pitch.
 * Safe zone: y 20 (attack) to y 85 (GK), x 15 to 85 (no clipping).
 * Slots use position: absolute with left: x%, top: y%, transform: translate(-50%, -50%).
 * pos: 'GK' | 'DEF' | 'MID' | 'ATT' for role terminology (LWB, CDM, CAM, CF, etc.).
 */

/** Build adjacency pairs from slot ids (neighbors by similar y, then x) */
function buildAdjacency(slotsArray) {
  const ids = slotsArray.map((s) => s.id);
  const byId = Object.fromEntries(slotsArray.map((s) => [s.id, s]));
  const links = [];
  const added = new Set();
  const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = byId[ids[i]];
      const b = byId[ids[j]];
      const dy = Math.abs(a.y - b.y);
      const dx = Math.abs(a.x - b.x);
      if (dy <= 18 && dx <= 45) links.push([ids[i], ids[j]]);
    }
  }
  return links;
}

/** Convert array format to slots object and formation entry */
function toFormationEntry(id, name, slotsArray) {
  const slots = Object.fromEntries(slotsArray.map((s) => [s.id, { x: s.x, y: s.y }]));
  const slotPos = Object.fromEntries(slotsArray.map((s) => [s.id, s.pos]));
  const adjacency = buildAdjacency(slotsArray);
  return { id, name, slots, slotPos, adjacency };
}

// ─── 4-AT-THE-BACK ─────────────────────────────────────────────────────────

const FORMATION_442_FLAT = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LB', pos: 'DEF', x: 15, y: 72 },
  { id: 'LCB', pos: 'DEF', x: 35, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 65, y: 72 },
  { id: 'RB', pos: 'DEF', x: 85, y: 72 },
  { id: 'LM', pos: 'MID', x: 22, y: 45 },
  { id: 'LCM', pos: 'MID', x: 42, y: 45 },
  { id: 'RCM', pos: 'MID', x: 58, y: 45 },
  { id: 'RM', pos: 'MID', x: 78, y: 45 },
  { id: 'ST1', pos: 'ATT', x: 38, y: 18 },
  { id: 'ST2', pos: 'ATT', x: 62, y: 18 },
];

const FORMATION_442_HOLDING = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LB', pos: 'DEF', x: 15, y: 72 },
  { id: 'LCB', pos: 'DEF', x: 35, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 65, y: 72 },
  { id: 'RB', pos: 'DEF', x: 85, y: 72 },
  { id: 'CDM', pos: 'MID', x: 50, y: 58 },
  { id: 'LM', pos: 'MID', x: 22, y: 45 },
  { id: 'LCM', pos: 'MID', x: 42, y: 45 },
  { id: 'RCM', pos: 'MID', x: 58, y: 45 },
  { id: 'RM', pos: 'MID', x: 78, y: 45 },
  { id: 'ST1', pos: 'ATT', x: 38, y: 18 },
  { id: 'ST2', pos: 'ATT', x: 62, y: 18 },
];

const FORMATION_433_ATTACK = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LB', pos: 'DEF', x: 15, y: 72 },
  { id: 'LCB', pos: 'DEF', x: 35, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 65, y: 72 },
  { id: 'RB', pos: 'DEF', x: 85, y: 72 },
  { id: 'LCM', pos: 'MID', x: 28, y: 45 },
  { id: 'CM', pos: 'MID', x: 50, y: 45 },
  { id: 'RCM', pos: 'MID', x: 72, y: 45 },
  { id: 'LW', pos: 'ATT', x: 18, y: 18 },
  { id: 'ST', pos: 'ATT', x: 50, y: 18 },
  { id: 'RW', pos: 'ATT', x: 82, y: 18 },
];

const FORMATION_433_DEFEND = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LB', pos: 'DEF', x: 15, y: 72 },
  { id: 'LCB', pos: 'DEF', x: 35, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 65, y: 72 },
  { id: 'RB', pos: 'DEF', x: 85, y: 72 },
  { id: 'LDM', pos: 'MID', x: 32, y: 58 },
  { id: 'CDM', pos: 'MID', x: 50, y: 58 },
  { id: 'RDM', pos: 'MID', x: 68, y: 58 },
  { id: 'LW', pos: 'ATT', x: 22, y: 18 },
  { id: 'ST', pos: 'ATT', x: 50, y: 18 },
  { id: 'RW', pos: 'ATT', x: 78, y: 18 },
];

const FORMATION_433_FALSE9 = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LB', pos: 'DEF', x: 15, y: 72 },
  { id: 'LCB', pos: 'DEF', x: 35, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 65, y: 72 },
  { id: 'RB', pos: 'DEF', x: 85, y: 72 },
  { id: 'LCM', pos: 'MID', x: 28, y: 45 },
  { id: 'CM', pos: 'MID', x: 50, y: 45 },
  { id: 'RCM', pos: 'MID', x: 72, y: 45 },
  { id: 'LW', pos: 'ATT', x: 20, y: 18 },
  { id: 'CF', pos: 'ATT', x: 50, y: 32 },
  { id: 'RW', pos: 'ATT', x: 80, y: 18 },
];

const FORMATION_4231_WIDE = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LB', pos: 'DEF', x: 15, y: 72 },
  { id: 'LCB', pos: 'DEF', x: 35, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 65, y: 72 },
  { id: 'RB', pos: 'DEF', x: 85, y: 72 },
  { id: 'LDM', pos: 'MID', x: 35, y: 58 },
  { id: 'RDM', pos: 'MID', x: 65, y: 58 },
  { id: 'LM', pos: 'MID', x: 15, y: 32 },
  { id: 'CAM', pos: 'MID', x: 50, y: 32 },
  { id: 'RM', pos: 'MID', x: 85, y: 32 },
  { id: 'ST', pos: 'ATT', x: 50, y: 18 },
];

const FORMATION_4231_NARROW = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LB', pos: 'DEF', x: 15, y: 72 },
  { id: 'LCB', pos: 'DEF', x: 35, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 65, y: 72 },
  { id: 'RB', pos: 'DEF', x: 85, y: 72 },
  { id: 'LDM', pos: 'MID', x: 38, y: 58 },
  { id: 'RDM', pos: 'MID', x: 62, y: 58 },
  { id: 'LAM', pos: 'MID', x: 32, y: 32 },
  { id: 'CAM', pos: 'MID', x: 50, y: 32 },
  { id: 'RAM', pos: 'MID', x: 68, y: 32 },
  { id: 'ST', pos: 'ATT', x: 50, y: 18 },
];

const FORMATION_41212_WIDE = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LB', pos: 'DEF', x: 15, y: 72 },
  { id: 'LCB', pos: 'DEF', x: 35, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 65, y: 72 },
  { id: 'RB', pos: 'DEF', x: 85, y: 72 },
  { id: 'CDM', pos: 'MID', x: 50, y: 58 },
  { id: 'LM', pos: 'MID', x: 22, y: 45 },
  { id: 'CAM', pos: 'MID', x: 50, y: 32 },
  { id: 'RM', pos: 'MID', x: 78, y: 45 },
  { id: 'ST1', pos: 'ATT', x: 38, y: 18 },
  { id: 'ST2', pos: 'ATT', x: 62, y: 18 },
];

const FORMATION_41212_NARROW = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LB', pos: 'DEF', x: 15, y: 72 },
  { id: 'LCB', pos: 'DEF', x: 35, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 65, y: 72 },
  { id: 'RB', pos: 'DEF', x: 85, y: 72 },
  { id: 'CDM', pos: 'MID', x: 50, y: 58 },
  { id: 'LCM', pos: 'MID', x: 38, y: 45 },
  { id: 'CAM', pos: 'MID', x: 50, y: 32 },
  { id: 'RCM', pos: 'MID', x: 62, y: 45 },
  { id: 'ST1', pos: 'ATT', x: 38, y: 18 },
  { id: 'ST2', pos: 'ATT', x: 62, y: 18 },
];

const FORMATION_451 = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LB', pos: 'DEF', x: 15, y: 72 },
  { id: 'LCB', pos: 'DEF', x: 35, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 65, y: 72 },
  { id: 'RB', pos: 'DEF', x: 85, y: 72 },
  { id: 'LM', pos: 'MID', x: 18, y: 45 },
  { id: 'LCM', pos: 'MID', x: 35, y: 45 },
  { id: 'CM', pos: 'MID', x: 50, y: 45 },
  { id: 'RCM', pos: 'MID', x: 65, y: 45 },
  { id: 'RM', pos: 'MID', x: 82, y: 45 },
  { id: 'ST', pos: 'ATT', x: 50, y: 18 },
];

const FORMATION_4141 = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LB', pos: 'DEF', x: 15, y: 72 },
  { id: 'LCB', pos: 'DEF', x: 35, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 65, y: 72 },
  { id: 'RB', pos: 'DEF', x: 85, y: 72 },
  { id: 'CDM', pos: 'MID', x: 50, y: 58 },
  { id: 'LM', pos: 'MID', x: 20, y: 45 },
  { id: 'LCM', pos: 'MID', x: 38, y: 45 },
  { id: 'RCM', pos: 'MID', x: 62, y: 45 },
  { id: 'RM', pos: 'MID', x: 80, y: 45 },
  { id: 'ST', pos: 'ATT', x: 50, y: 18 },
];

const FORMATION_4411 = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LB', pos: 'DEF', x: 15, y: 72 },
  { id: 'LCB', pos: 'DEF', x: 35, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 65, y: 72 },
  { id: 'RB', pos: 'DEF', x: 85, y: 72 },
  { id: 'LM', pos: 'MID', x: 22, y: 45 },
  { id: 'LCM', pos: 'MID', x: 42, y: 45 },
  { id: 'RCM', pos: 'MID', x: 58, y: 45 },
  { id: 'RM', pos: 'MID', x: 78, y: 45 },
  { id: 'CF', pos: 'ATT', x: 50, y: 32 },
  { id: 'ST', pos: 'ATT', x: 50, y: 18 },
];

// ─── 3-AT-THE-BACK ─────────────────────────────────────────────────────────

const FORMATION_352 = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LCB', pos: 'DEF', x: 25, y: 72 },
  { id: 'CB', pos: 'DEF', x: 50, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 75, y: 72 },
  { id: 'LWB', pos: 'DEF', x: 15, y: 58 },
  { id: 'LCM', pos: 'MID', x: 32, y: 45 },
  { id: 'CM', pos: 'MID', x: 50, y: 45 },
  { id: 'RCM', pos: 'MID', x: 68, y: 45 },
  { id: 'RWB', pos: 'DEF', x: 85, y: 58 },
  { id: 'ST1', pos: 'ATT', x: 38, y: 18 },
  { id: 'ST2', pos: 'ATT', x: 62, y: 18 },
];

const FORMATION_343 = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LCB', pos: 'DEF', x: 25, y: 72 },
  { id: 'CB', pos: 'DEF', x: 50, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 75, y: 72 },
  { id: 'LM', pos: 'MID', x: 20, y: 45 },
  { id: 'LCM', pos: 'MID', x: 40, y: 45 },
  { id: 'RCM', pos: 'MID', x: 60, y: 45 },
  { id: 'RM', pos: 'MID', x: 80, y: 45 },
  { id: 'LW', pos: 'ATT', x: 22, y: 18 },
  { id: 'ST', pos: 'ATT', x: 50, y: 18 },
  { id: 'RW', pos: 'ATT', x: 78, y: 18 },
];

const FORMATION_3421 = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LCB', pos: 'DEF', x: 25, y: 72 },
  { id: 'CB', pos: 'DEF', x: 50, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 75, y: 72 },
  { id: 'LWB', pos: 'DEF', x: 15, y: 58 },
  { id: 'RWB', pos: 'DEF', x: 85, y: 58 },
  { id: 'LCM', pos: 'MID', x: 35, y: 45 },
  { id: 'RCM', pos: 'MID', x: 65, y: 45 },
  { id: 'LF', pos: 'ATT', x: 32, y: 18 },
  { id: 'CF', pos: 'ATT', x: 50, y: 18 },
  { id: 'RF', pos: 'ATT', x: 68, y: 18 },
];

const FORMATION_3142 = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LCB', pos: 'DEF', x: 28, y: 72 },
  { id: 'CB', pos: 'DEF', x: 50, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 72, y: 72 },
  { id: 'CDM', pos: 'MID', x: 50, y: 58 },
  { id: 'LWB', pos: 'DEF', x: 15, y: 45 },
  { id: 'LCM', pos: 'MID', x: 38, y: 45 },
  { id: 'RCM', pos: 'MID', x: 62, y: 45 },
  { id: 'RWB', pos: 'DEF', x: 85, y: 45 },
  { id: 'ST1', pos: 'ATT', x: 38, y: 18 },
  { id: 'ST2', pos: 'ATT', x: 62, y: 18 },
];

// ─── 5-AT-THE-BACK ─────────────────────────────────────────────────────────

const FORMATION_532 = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LWB', pos: 'DEF', x: 15, y: 72 },
  { id: 'LCB', pos: 'DEF', x: 28, y: 72 },
  { id: 'CB', pos: 'DEF', x: 50, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 72, y: 72 },
  { id: 'RWB', pos: 'DEF', x: 85, y: 72 },
  { id: 'LCM', pos: 'MID', x: 35, y: 45 },
  { id: 'CM', pos: 'MID', x: 50, y: 45 },
  { id: 'RCM', pos: 'MID', x: 65, y: 45 },
  { id: 'ST1', pos: 'ATT', x: 38, y: 18 },
  { id: 'ST2', pos: 'ATT', x: 62, y: 18 },
];

const FORMATION_541 = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LWB', pos: 'DEF', x: 15, y: 72 },
  { id: 'LCB', pos: 'DEF', x: 28, y: 72 },
  { id: 'CB', pos: 'DEF', x: 50, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 72, y: 72 },
  { id: 'RWB', pos: 'DEF', x: 85, y: 72 },
  { id: 'LM', pos: 'MID', x: 22, y: 45 },
  { id: 'LCM', pos: 'MID', x: 42, y: 45 },
  { id: 'RCM', pos: 'MID', x: 58, y: 45 },
  { id: 'RM', pos: 'MID', x: 78, y: 45 },
  { id: 'ST', pos: 'ATT', x: 50, y: 18 },
];

const FORMATION_5212 = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LWB', pos: 'DEF', x: 15, y: 72 },
  { id: 'LCB', pos: 'DEF', x: 28, y: 72 },
  { id: 'CB', pos: 'DEF', x: 50, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 72, y: 72 },
  { id: 'RWB', pos: 'DEF', x: 85, y: 72 },
  { id: 'LCM', pos: 'MID', x: 38, y: 45 },
  { id: 'CAM', pos: 'MID', x: 50, y: 32 },
  { id: 'RCM', pos: 'MID', x: 62, y: 45 },
  { id: 'ST1', pos: 'ATT', x: 38, y: 18 },
  { id: 'ST2', pos: 'ATT', x: 62, y: 18 },
];

const FORMATION_5221 = [
  { id: 'GK', pos: 'GK', x: 50, y: 88 },
  { id: 'LWB', pos: 'DEF', x: 15, y: 72 },
  { id: 'LCB', pos: 'DEF', x: 28, y: 72 },
  { id: 'CB', pos: 'DEF', x: 50, y: 72 },
  { id: 'RCB', pos: 'DEF', x: 72, y: 72 },
  { id: 'RWB', pos: 'DEF', x: 85, y: 72 },
  { id: 'LDM', pos: 'MID', x: 38, y: 58 },
  { id: 'RDM', pos: 'MID', x: 62, y: 58 },
  { id: 'LF', pos: 'ATT', x: 32, y: 18 },
  { id: 'ST', pos: 'ATT', x: 50, y: 18 },
  { id: 'RF', pos: 'ATT', x: 68, y: 18 },
];

// ─── Formation arrays by category (for selector UI) ─────────────────────────

const FORMATION_ARRAYS = {
  '442_Flat': FORMATION_442_FLAT,
  '442_Holding': FORMATION_442_HOLDING,
  '433_Attack': FORMATION_433_ATTACK,
  '433_Defend': FORMATION_433_DEFEND,
  '433_False9': FORMATION_433_FALSE9,
  '4231_Wide': FORMATION_4231_WIDE,
  '4231_Narrow': FORMATION_4231_NARROW,
  '41212_Wide': FORMATION_41212_WIDE,
  '41212_Narrow': FORMATION_41212_NARROW,
  '451': FORMATION_451,
  '4141': FORMATION_4141,
  '4411': FORMATION_4411,
  '352': FORMATION_352,
  '343': FORMATION_343,
  '3421': FORMATION_3421,
  '3142': FORMATION_3142,
  '532': FORMATION_532,
  '541': FORMATION_541,
  '5212': FORMATION_5212,
  '5221': FORMATION_5221,
};

/** Display names for formation keys */
const FORMATION_DISPLAY_NAMES = {
  '442_Flat': '4-4-2 (Flat)',
  '442_Holding': '4-4-2 (Holding)',
  '433_Attack': '4-3-3 (Attack)',
  '433_Defend': '4-3-3 (Defend)',
  '433_False9': '4-3-3 (False 9)',
  '4231_Wide': '4-2-3-1 (Wide)',
  '4231_Narrow': '4-2-3-1 (Narrow)',
  '41212_Wide': '4-1-2-1-2 (Wide)',
  '41212_Narrow': '4-1-2-1-2 (Narrow)',
  '451': '4-5-1',
  '4141': '4-1-4-1',
  '4411': '4-4-1-1',
  '352': '3-5-2',
  '343': '3-4-3',
  '3421': '3-4-2-1',
  '3142': '3-1-4-2',
  '532': '5-3-2',
  '541': '5-4-1',
  '5212': '5-2-1-2',
  '5221': '5-2-2-1',
};

/** Category keys and their formation ids */
export const FORMATION_CATEGORIES = {
  '4-at-the-back': [
    '442_Flat',
    '442_Holding',
    '433_Attack',
    '433_Defend',
    '433_False9',
    '4231_Wide',
    '4231_Narrow',
    '41212_Wide',
    '41212_Narrow',
    '451',
    '4141',
    '4411',
  ],
  '3-at-the-back': ['352', '343', '3421', '3142'],
  '5-at-the-back': ['532', '541', '5212', '5221'],
};

/** Build FORMATIONS object for SquadBuilder (id, name, slots, slotPos, adjacency) */
const FORMATIONS = {};
for (const [key, arr] of Object.entries(FORMATION_ARRAYS)) {
  const name = FORMATION_DISPLAY_NAMES[key] || key;
  FORMATIONS[key] = toFormationEntry(key, name, arr);
}

/** Map slot role (pos) to database position for player filter */
export const POS_TO_DB_POSITION = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  ATT: 'Forward',
};

/** Legacy: slot id → database position (all possible slots across formations) */
export const SLOT_TO_POSITION = {};
for (const f of Object.values(FORMATIONS)) {
  for (const [slotId, pos] of Object.entries(f.slotPos)) {
    SLOT_TO_POSITION[slotId] = POS_TO_DB_POSITION[pos] || 'Midfielder';
  }
}

export { FORMATIONS, FORMATION_ARRAYS, FORMATION_DISPLAY_NAMES };
export const DEFAULT_FORMATION_ID = '4231_Wide';
