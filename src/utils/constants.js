import { Cpu, Hexagon, Database } from '../components/Icons';

export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
export const RESOLVE_ROUND_TIMER = 2000; // milliseconds
export const INITIAL_TIME = 300; // seconds (5 minutes)

// Animation Timing Constants (milliseconds)
export const CARD_LANDING_FLASH_DURATION = 600;
export const TIE_ANIMATION_DURATION = 1000;
export const CARD_FLIGHT_DURATION = 300;
export const PRIZE_ANIMATION_DELAY = 500;
export const PRIZE_ANIMATION_DURATION = 1000; // CSS transition duration in ms
export const PRIZE_ANIMATION_CLEANUP = 500;
export const PROGRESS_BAR_UPDATE_DELAY = 800;
export const THEME = {
    prize: {
        name: 'NET_CORE',
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/10',
        border: 'border-yellow-400',
        shadow: 'shadow-yellow-400/50',
        icon: Database
    },
    player: {
        name: 'CYBER_OPS',
        color: 'text-cyan-400',
        bg: 'bg-cyan-400/10',
        border: 'border-cyan-400',
        shadow: 'shadow-cyan-400/50',
        icon: Cpu
    },
    cpu: {
        name: 'VOID_SYN',
        color: 'text-fuchsia-500',
        bg: 'bg-fuchsia-500/10',
        border: 'border-fuchsia-500',
        shadow: 'shadow-fuchsia-500/50',
        icon: Hexagon
    },
};

export const RANK_LABELS = { 1: 'V1', 11: 'J-MOD', 12: 'Q-CORE', 13: 'K-MAX' };
