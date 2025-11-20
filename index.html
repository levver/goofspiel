import React, { useState, useEffect, useRef } from 'react';
import { 
  Hexagon, Cpu, Shield, Database, Activity, Skull, X, Clock, Trophy
} from 'lucide-react';

// --- Constants & Theming ---

const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

const THEME = {
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

const RANK_LABELS = { 1: 'V1', 11: 'J-MOD', 12: 'Q-CORE', 13: 'K-MAX' };

const shuffle = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// --- Components ---

const DataChip = ({ 
  rank, 
  type, 
  faceDown = false, 
  onClick, 
  disabled = false, 
  highlight = false, 
  className = "",
  style = {},
  compact = false
}) => {
  const theme = THEME[type];
  const Icon = theme.icon;
  const label = RANK_LABELS[rank] || (rank < 10 ? `0${rank}` : rank);

  const widthClass = compact ? 'w-16' : 'w-20 sm:w-24';
  const heightClass = compact ? 'h-24' : 'h-28 sm:h-36';
  const textSize = compact ? 'text-sm' : 'text-lg';

  if (faceDown) {
    return (
      <div 
        className={`relative ${widthClass} ${heightClass} bg-slate-900 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center overflow-hidden ${className}`}
        style={style}
      >
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] opacity-20"></div>
        <Shield className="w-6 h-6 text-slate-600 animate-pulse" />
      </div>
    );
  }

  return (
    <button
      // Pass the event object 'e' up to the handler
      onClick={(e) => !disabled && onClick && onClick(rank, e)}
      disabled={disabled}
      style={style}
      className={`
        relative ${widthClass} ${heightClass} bg-slate-900/90 backdrop-blur-md rounded-xl border transition-all duration-300 group
        flex flex-col justify-between p-1.5 select-none overflow-hidden
        ${theme.border}
        ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}
        ${highlight ? `ring-2 ring-offset-1 ring-offset-slate-900 ${theme.shadow} -translate-y-2` : ''}
        ${className}
      `}
    >
      <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-${theme.color.split('-')[1]}-500/10 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500 translate-y-[-100%] group-hover:translate-y-[100%] h-[200%] w-full`} />

      <div className="flex justify-between items-start">
        <span className={`font-mono font-bold ${textSize} ${theme.color}`}>{rank}</span>
        {!compact && <Icon size={14} className={theme.color} />}
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Icon strokeWidth={1} className={`w-8 h-8 opacity-20 ${theme.color}`} />
      </div>

      <div className="flex flex-col items-end">
        <span className={`text-[8px] font-mono opacity-70 ${theme.color}`}>{label}</span>
        <div className={`h-0.5 w-full bg-slate-800 mt-0.5 overflow-hidden rounded-full`}>
             <div className={`h-full ${theme.bg.replace('/10', '')} w-[${(rank/13)*100}%]`}></div>
        </div>
      </div>
    </button>
  );
};

const VerticalGraveyard = ({ usedCards, type }) => {
  const theme = THEME[type];
  return (
    <div className={`h-full flex flex-col items-center py-2 px-1 w-10 sm:w-12 bg-slate-900/40 border-${type === 'cpu' ? 'r' : 'l'} border-slate-800/50 backdrop-blur-sm`}>
      <div className={`text-[8px] font-mono uppercase tracking-widest mb-2 ${theme.color} opacity-70`}>
        {type === 'cpu' ? 'VOID' : 'UNIT'}
      </div>
      <div className="flex-1 flex flex-col justify-between w-full gap-1">
        {RANKS.map(r => {
          const isUsed = usedCards.includes(r);
          return (
            <div 
              key={r} 
              className={`
                flex items-center justify-center flex-1 w-full text-[10px] font-mono rounded-sm transition-all
                ${isUsed 
                  ? 'bg-slate-800/50 text-slate-600 line-through decoration-slate-600' 
                  : `${theme.bg} ${theme.color} border border-white/5 font-bold shadow-[0_0_5px_-2px_currentColor]`}
              `}
            >
              {r}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const HorizontalGraveyard = ({ usedCards, type }) => {
  const theme = THEME[type];
  return (
    <div className="w-full flex flex-col items-center py-1.5 px-2 bg-slate-900/40 border-b border-slate-800/50 backdrop-blur-sm mb-4">
       <div className={`text-[8px] font-mono uppercase tracking-widest mb-1.5 ${theme.color} opacity-70 flex items-center gap-1`}>
        <Trophy size={8} /> PRIZE HISTORY
      </div>
      <div className="flex justify-between w-full gap-0.5 sm:gap-1 max-w-[18rem]">
        {RANKS.map(r => {
          const isUsed = usedCards.includes(r);
          return (
            <div
              key={r}
              className={`
                flex items-center justify-center h-5 sm:h-6 flex-1 text-[8px] sm:text-[10px] font-mono rounded-sm transition-all
                ${isUsed
                  ? 'bg-slate-800/50 text-slate-600 line-through decoration-slate-600'
                  : `${theme.bg} ${theme.color} border border-white/5 font-bold shadow-[0_0_5px_-2px_currentColor]`}
              `}
            >
              {r}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StatBlock = ({ label, value, time, color, icon: Icon, align = 'left' }) => (
  <div className={`flex flex-col ${align === 'right' ? 'items-end' : 'items-start'}`}>
    <div className={`flex items-center gap-2 mb-1`}>
      <div className={`flex items-center gap-1 text-[10px] font-mono tracking-widest text-slate-500`}>
        {align === 'right' && label}
        <Icon size={10} className={color} />
        {align === 'left' && label}
      </div>
      
      {/* Timer Display */}
      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/50 text-[10px] font-mono ${time <= 30 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
         <Clock size={8} />
         <span>{formatTime(time)}</span>
      </div>
    </div>

    {/* Score Display - Increased Size */}
    <div className={`text-4xl sm:text-5xl font-black font-mono leading-none ${color} drop-shadow-2xl`}>{value}</div>
  </div>
);

// --- Main Game Logic ---

export default function GoofspielMobile() {
  const [gameState, setGameState] = useState('START'); 
  const [prizeDeck, setPrizeDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [cpuHand, setCpuHand] = useState([]);
  const [currentPrize, setCurrentPrize] = useState(null);
  
  const [playerBid, setPlayerBid] = useState(null);
  const [cpuBid, setCpuBid] = useState(null);
  
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);

  // Timers
  const [playerTime, setPlayerTime] = useState(600);
  const [cpuTime, setCpuTime] = useState(600);
  
  const [log, setLog] = useState({ msg: "SYSTEM READY", type: 'neutral' });
  
  const [playerGraveyard, setPlayerGraveyard] = useState([]);
  const [cpuGraveyard, setCpuGraveyard] = useState([]);
  const [prizeGraveyard, setPrizeGraveyard] = useState([]);

  // Animation States
  const [animatingCard, setAnimatingCard] = useState(null);
  const [animationProps, setAnimationProps] = useState(null);

  // Refs for animation targets
  const playerSlotRef = useRef(null);

  const roundNumber = Math.min(13, 13 - prizeDeck.length);

  const startNewGame = () => {
    setPrizeDeck(shuffle([...RANKS]));
    setPlayerHand([...RANKS]); 
    setCpuHand([...RANKS]);
    setPlayerGraveyard([]);
    setCpuGraveyard([]);
    setPrizeGraveyard([]);
    setPlayerScore(0);
    setCpuScore(0);
    setGameState('BETTING');
    setPlayerBid(null);
    setCpuBid(null);
    setAnimatingCard(null);
    setAnimationProps(null);
    setPlayerTime(600);
    setCpuTime(600);
    setLog({ msg: "ROUND 1 START", type: 'neutral' });
  };

  useEffect(() => {
    if (gameState === 'BETTING' && prizeDeck.length > 0 && !currentPrize) {
      const nextPrize = prizeDeck[0];
      setCurrentPrize(nextPrize);
      setPrizeDeck(prev => prev.slice(1));
    }
  }, [gameState, prizeDeck, currentPrize]);

  // Timer Logic
  useEffect(() => {
    let interval = null;
    if (gameState === 'BETTING' && playerTime > 0) {
      interval = setInterval(() => {
        setPlayerTime(t => Math.max(0, t - 1));
      }, 1000);
    }
    
    if (playerTime === 0 && gameState === 'BETTING') {
        // Time out lose condition
        setGameState('END');
        setLog({ msg: "TIME CRITICAL FAILURE", type: 'danger' });
    }

    return () => clearInterval(interval);
  }, [gameState, playerTime]);


  const getCpuBid = (prizeVal, currentHand) => {
    if (Math.random() < 0.2) return currentHand[Math.floor(Math.random() * currentHand.length)];
    let targetBid = prizeVal;
    if (prizeVal > 10) targetBid = 13; 
    if (prizeVal < 4) targetBid = 1;   
    let bestCard = currentHand[0];
    let minDiff = 100;
    currentHand.forEach(card => {
        const diff = Math.abs(card - targetBid);
        if (diff < minDiff) {
            minDiff = diff;
            bestCard = card;
        }
    });
    return bestCard;
  };

  const handleCardClick = (rank, e) => {
    if (gameState !== 'BETTING' || animatingCard) return;
    
    const cardWrapper = e.currentTarget.parentElement;
    const startRect = cardWrapper.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(cardWrapper);
    const slotRect = playerSlotRef.current.getBoundingClientRect();

    setAnimatingCard(rank);
    setAnimationProps({
        position: 'fixed',
        top: startRect.top,
        left: startRect.left,
        transform: computedStyle.transform, 
        zIndex: 100,
        transition: 'none' 
    });

    requestAnimationFrame(() => {
        const destTop = slotRect.top + (slotRect.height - startRect.height) / 2;
        const destLeft = slotRect.left + (slotRect.width - startRect.width) / 2;

        requestAnimationFrame(() => {
            setAnimationProps({
                position: 'fixed',
                top: destTop,
                left: destLeft,
                transform: 'rotate(0deg)', 
                zIndex: 100,
                transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' 
            });
        });
    });

    setTimeout(() => {
        commitPlayerBid(rank);
        setAnimatingCard(null);
        setAnimationProps(null);
    }, 600);
  };

  const commitPlayerBid = (rank) => {
    const cpuChoice = getCpuBid(currentPrize, cpuHand);
    setPlayerBid(rank);
    setCpuBid(cpuChoice);
    setGameState('RESOLVING');
    setLog({ msg: "DECRYPTING...", type: 'warning' });

    // Simulate CPU thinking time deduction (random 1-5 seconds per turn)
    setCpuTime(t => Math.max(0, t - Math.floor(Math.random() * 5) + 1));

    setTimeout(() => resolveRound(rank, cpuChoice), 1000);
  };

  const resolveRound = (pBid, cBid) => {
    let msg = "";
    let type = "neutral";

    if (pBid > cBid) {
      setPlayerScore(s => s + currentPrize);
      msg = `WON (+${currentPrize})`;
      type = "success";
    } else if (cBid > pBid) {
      setCpuScore(s => s + currentPrize);
      msg = `LOST (-${currentPrize})`;
      type = "danger";
    } else {
      msg = `TIED (0)`;
      type = "warning";
    }

    setLog({ msg, type });

    setPlayerHand(prev => prev.filter(c => c !== pBid));
    setCpuHand(prev => prev.filter(c => c !== cBid));
    setPlayerGraveyard(prev => [...prev, pBid]);
    setCpuGraveyard(prev => [...prev, cBid]);
    setPrizeGraveyard(prev => [...prev, currentPrize]); // Track prize history

    setTimeout(() => {
      setPlayerBid(null);
      setCpuBid(null);
      setCurrentPrize(null);
      
      if (playerHand.length === 1) {
         setGameState('END');
      } else {
         setGameState('BETTING');
      }
    }, 1500);
  };

  useEffect(() => { startNewGame(); }, []);

  const getCardStyle = (index, total) => {
    const isMobile = window.innerWidth < 640;
    const arcStrength = isMobile ? 4 : 6;
    const spread = isMobile ? 25 : 35;
    const middle = (total - 1) / 2;
    const diff = index - middle;
    const rotation = diff * (isMobile ? 3 : 4);
    const yOffset = Math.abs(diff) * arcStrength; 
    
    return {
      transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
      left: `calc(50% + ${(index - middle) * spread}px)`,
      bottom: '10px',
      zIndex: index + 10, 
    };
  };

  return (
    <div className="fixed inset-0 bg-[#0a0e17] font-sans text-slate-200 flex flex-col overflow-hidden selection:bg-cyan-500/30">
      
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}></div>

      {/* Compact Mobile HUD */}
      <div className="relative z-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-3 flex justify-between items-center shadow-xl">
        <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-mono tracking-widest">ROUND</span>
            <span className="text-xl font-bold text-white font-mono leading-none">{roundNumber}<span className="text-slate-600 text-sm">/13</span></span>
        </div>
        
        <div className={`px-3 py-1 rounded text-xs font-mono font-bold tracking-wider transition-colors duration-300
            ${log.type === 'success' ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/30' : 
              log.type === 'danger' ? 'bg-fuchsia-900/50 text-fuchsia-400 border border-fuchsia-500/30' : 
              'bg-slate-800 text-slate-300 border border-slate-700'}
        `}>
            {log.msg}
        </div>

        <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-mono tracking-widest">POOL</span>
            <span className="text-xl font-bold text-yellow-500 font-mono leading-none">
                {prizeDeck.reduce((a,b)=>a+b,0) + (currentPrize||0)}
            </span>
        </div>
      </div>

      {/* Main Arena Layout */}
      <div className="flex-1 relative flex flex-col w-full max-w-md mx-auto">
        
        {/* Opponent Bar */}
        <div className="px-4 py-2 flex justify-end items-end border-b border-slate-800/30">
            <StatBlock 
                label="CPU" 
                value={cpuScore} 
                time={cpuTime}
                color="text-fuchsia-500" 
                icon={Hexagon} 
                align="right" 
            />
        </div>

        {/* Arena Middle: Graveyard - Table - Graveyard */}
        <div className="flex-1 flex items-stretch relative overflow-hidden">
            
            {/* CPU Graveyard (Left) */}
            <VerticalGraveyard usedCards={cpuGraveyard} type="cpu" />

            {/* Center Card Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
                 
                 {/* NEW: Horizontal Prize Graveyard */}
                 <HorizontalGraveyard usedCards={prizeGraveyard} type="prize" />

                 <div className="flex-1 flex items-center justify-center w-full">
                    <div className="flex items-center justify-center gap-2 sm:gap-6 w-full scale-90 sm:scale-100">
                        
                        {/* Opponent Slot */}
                        <div className="relative w-20 h-28 border border-dashed border-slate-700 rounded-xl flex items-center justify-center bg-slate-900/30">
                            <span className="text-[8px] font-mono text-fuchsia-500/50 absolute -top-3">OPP</span>
                            {cpuBid && (
                                <div className="animate-in fade-in zoom-in duration-300">
                                    <DataChip rank={cpuBid} type="cpu" faceDown={gameState !== 'RESOLVING'} compact={true} />
                                </div>
                            )}
                        </div>

                        {/* Prize Slot */}
                        <div className="relative z-10 -mt-6">
                            <div className="absolute -inset-4 bg-yellow-500/10 blur-xl rounded-full animate-pulse"></div>
                            {currentPrize ? (
                                <DataChip rank={currentPrize} type="prize" highlight={true} />
                            ) : (
                                <div className="w-20 h-28 border border-yellow-500/30 rounded-xl flex items-center justify-center">
                                    <Activity className="text-yellow-500 animate-spin" />
                                </div>
                            )}
                        </div>

                        {/* Player Slot (Target for animation) */}
                        <div 
                            ref={playerSlotRef}
                            className="relative w-20 h-28 border border-dashed border-slate-700 rounded-xl flex items-center justify-center bg-slate-900/30"
                        >
                            <span className="text-[8px] font-mono text-cyan-500/50 absolute -top-3">YOU</span>
                            {playerBid && !animatingCard && (
                                <div className="animate-in fade-in zoom-in duration-300">
                                    <DataChip rank={playerBid} type="player" compact={true} />
                                </div>
                            )}
                        </div>
                    </div>
                 </div>
            </div>

            {/* Player Graveyard (Right) */}
            <VerticalGraveyard usedCards={playerGraveyard} type="player" />

        </div>

        {/* Player Stats */}
        <div className="px-4 py-2 flex justify-between items-start border-t border-slate-800/30 bg-slate-900/20">
            <StatBlock 
                label="YOU" 
                value={playerScore} 
                time={playerTime}
                color="text-cyan-400" 
                icon={Cpu} 
                align="left" 
            />
        </div>

        {/* Player Hand Area */}
        <div className="h-40 sm:h-48 w-full relative touch-none">
            <div className="absolute inset-0 flex justify-center items-end pb-4">
                 {playerHand.length === 0 && gameState !== 'END' && <div className="text-xs text-slate-600 font-mono animate-pulse">RELOADING...</div>}
                 
                 {playerHand.map((rank, index) => {
                    const isAnimating = rank === animatingCard;
                    if (rank === playerBid && !isAnimating) return null;

                    const baseStyle = getCardStyle(index, playerHand.length);
                    const style = isAnimating && animationProps ? animationProps : baseStyle;
                    const isInteractionDisabled = gameState !== 'BETTING' || (animatingCard && !isAnimating);

                    return (
                        <div 
                            key={rank} 
                            className={`
                                absolute transition-all duration-300 ease-out origin-bottom
                                ${!isAnimating && !isInteractionDisabled ? 'hover:!transform-none hover:!translate-y-[-30px] hover:!z-[100] hover:scale-110 cursor-pointer' : ''}
                            `}
                            style={style}
                        >
                            <DataChip 
                                rank={rank} 
                                type="player" 
                                onClick={handleCardClick}
                                disabled={isInteractionDisabled}
                                compact={true}
                            />
                        </div>
                    );
                 })}
            </div>
        </div>
      </div>

      {/* End Screen */}
      {gameState === 'END' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-md animate-in fade-in p-8">
            <div className="flex flex-col items-center w-full max-w-sm border border-slate-700 rounded-2xl p-8 bg-black/50 shadow-2xl">
                <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">
                    {playerTime === 0 ? <span className="text-red-500">TIME OUT</span> :
                     playerScore > cpuScore ? <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">VICTORY</span> : 
                     playerScore < cpuScore ? <span className="text-fuchsia-500 drop-shadow-[0_0_10px_rgba(217,70,239,0.5)]">DEFEAT</span> : 
                     "DRAW"}
                </h1>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent my-6"></div>
                <div className="flex justify-between w-full px-4 mb-8">
                        <div className="text-center">
                            <div className="text-xs text-slate-500 mb-1">YOUR SCORE</div>
                            <div className="text-3xl font-mono font-bold text-cyan-400">{playerScore}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-slate-500 mb-1">OPPONENT</div>
                            <div className="text-3xl font-mono font-bold text-fuchsia-500">{cpuScore}</div>
                        </div>
                </div>
                <button 
                    onClick={startNewGame}
                    className="w-full bg-slate-100 text-slate-900 font-bold py-4 rounded-lg hover:bg-cyan-400 hover:scale-105 transition-all uppercase tracking-widest shadow-lg"
                >
                    Play Again
                </button>
            </div>
        </div>
      )}
    </div>
  );
}
