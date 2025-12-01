import { Cpu, Hexagon, Database } from '../components/Icons';

export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
export const RESOLVE_ROUND_TIMER = 1000; // milliseconds
export const INITIAL_TIME = 300; // seconds (5 minutes)

// Animation Timing Constants (milliseconds)
export const CARD_LANDING_FLASH_DURATION = 600;
export const TIE_ANIMATION_DURATION = 1500;
export const CARD_FLIGHT_DURATION = 300;
export const PRIZE_ANIMATION_DELAY = 500;
export const PRIZE_ANIMATION_DURATION = 1000; // CSS transition duration in ms
export const PRIZE_ANIMATION_CLEANUP = 500;
export const PROGRESS_BAR_UPDATE_DELAY = 800;
export const THEME = {
    prize: {
        name: 'NEXUS_CORE',
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/10',
        border: 'border-yellow-400',
        shadow: 'shadow-yellow-400/50',
        icon: Database
    },
    player: {
        name: 'GALACTIC_FEDERATION',
        color: 'text-cyan-400',
        bg: 'bg-cyan-400/10',
        border: 'border-cyan-400',
        shadow: 'shadow-cyan-400/50',
        icon: Cpu
    },
    cpu: {
        name: 'VOID_SYNDICATE',
        color: 'text-fuchsia-500',
        bg: 'bg-fuchsia-500/10',
        border: 'border-fuchsia-500',
        shadow: 'shadow-fuchsia-500/50',
        icon: Hexagon
    },
};

export const RANK_LABELS = { 1: 'V1', 11: 'J-MOD', 12: 'Q-CORE', 13: 'K-MAX' };

export const GAME_STATUS = {
    WAITING: 'WAITING',
    PLAYING: 'PLAYING',
    RESOLVING: 'RESOLVING',
    END: 'END',
    ABANDONED: 'ABANDONED'
};

export const ROLES = {
    HOST: 'host',
    GUEST: 'guest'
};

export const MESSAGES = {
    SYSTEM_READY: "SYSTEM READY",
    WON: "WON",
    TIED: "TIED (0)",
    HOST_WINS_LEAD: "HOST WINS (INSURMOUNTABLE LEAD)",
    GUEST_WINS_LEAD: "GUEST WINS (INSURMOUNTABLE LEAD)",
    HOST_TIMED_OUT: "HOST TIMED OUT",
    GUEST_TIMED_OUT: "GUEST TIMED OUT",
    ROUND_PREFIX: "ROUND "
};

export const UI_TEXT = {
    AUTHENTICATING: "AUTHENTICATING...",
    CONNECTING: "CONNECTING...",
    YOU: "YOU",
    OPP: "OPP",
    OPPONENT_DEFAULT_NAME: "OPPONENT",
    FORFEIT_CONFIRM: "Are you sure you want to forfeit?",
    TIE: "TIE"
};

export const LOBBY_TEXT = {
    TITLE: "SYNC",
    SUBTITLE: "Nexus Control",
    GUEST_LABEL: "GUEST",
    RATING_LABEL: "RATING",
    WL_LABEL: "W/L",
    WR_LABEL: "WR",
    SIGN_OUT: "SIGN OUT",
    SEARCHING: "SEARCHING FOR OPPONENT...",
    CANCEL_SEARCH: "CANCEL SEARCH",
    FIND_MATCH: "FIND MATCH",
    OR: "OR",
    CREATE_GAME: "CREATE NEW GAME",
    JOIN_EXISTING: "OR JOIN EXISTING",
    ENTER_CODE_PLACEHOLDER: "ENTER ACCESS CODE",
    CONNECTING: "CONNECTING...",
    JOIN_GAME: "JOIN GAME"
};

export const AUTH_TEXT = {
    TITLE: "SYNC",
    SUBTITLE: LOBBY_TEXT.SUBTITLE,
    EMAIL_LABEL: "EMAIL",
    PASSWORD_LABEL: "PASSWORD",
    EMAIL_PLACEHOLDER: "player@sync.com",
    PASSWORD_PLACEHOLDER: "••••••••",
    LOADING: "LOADING...",
    SIGN_UP: "SIGN UP",
    SIGN_IN: "SIGN IN",
    SWITCH_TO_SIGN_IN: "Already have an account? Sign In",
    SWITCH_TO_SIGN_UP: "Don't have an account? Sign Up",
    OR: "OR",
    GUEST_LOGIN: "CONTINUE AS GUEST",
    TOS: "By continuing, you agree to our Terms of Service"
};

export const WAITING_TEXT = {
    TITLE: "WAITING FOR OPPONENT",
    SHARE_CODE: "SHARE THIS CODE",
    CANCEL: "CANCEL"
};

export const FIREBASE_PATHS = {
    GAMES: 'games',
    QUEUE: 'queue',
    USERS: 'users'
};

export const LOCAL_STORAGE_KEYS = {
    ACTIVE_GAME: 'activeGame'
};

export const REMATCH_STATUS = {
    WAITING: 'waiting',
    OPPONENT_REQUESTED: 'opponent-requested',
    ACCEPTED: 'accepted',
    LEFT: 'left',
    DECLINED: 'declined'
};

export const LOG_TYPES = {
    NEUTRAL: 'neutral',
    DANGER: 'danger',
    WARNING: 'warning',
    HOST: 'host',
    GUEST: 'guest'
};

export const TIMINGS = {
    RECONNECT_TIMEOUT: 300000, // 5 minutes
    ABANDONMENT_TIMEOUT: 60000, // 60s
    DISCONNECT_TIMEOUT: 30000, // 30s
    HEARTBEAT_INTERVAL: 5000, // 5s
    REMATCH_RELOAD_DELAY: 3000, // 3s
    DECLINE_RELOAD_DELAY: 2000, // 2s
    TIMER_TICK_INTERVAL: 1000 // 1s
};
