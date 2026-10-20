import React, { useRef, useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Flame,
  Volume2,
  VolumeX,
  RotateCcw,
  Play,
  Heart,
  Timer,
  CheckCircle2,
  AlertCircle,
  X,
  Target,
  Sparkles,
} from 'lucide-react';
import { SAMPLE_CASES } from '../utils/sampleCases';
import { soundFx } from '../utils/audioSynth';

interface RadQuestGameProps {
  onExit: () => void;
}

interface GameCase {
  id: string;
  title: string;
  modality: string;
  hint: string;
  dataUrl: string;
  targetBox: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
}

export const RadQuestGame: React.FC<RadQuestGameProps> = ({ onExit }) => {
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover' | 'victory'>('title');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return Number(localStorage.getItem('radquest_highscore') || '0');
  });
  const [streak, setStreak] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [lives, setLives] = useState<number>(3);
  const [currentCaseIndex, setCurrentCaseIndex] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [feedbackFlash, setFeedbackFlash] = useState<'hit' | 'miss' | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(soundFx.isMuted());
  const [hitMessage, setHitMessage] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const cameraShakeRef = useRef<number>(0);
  const hitStopRef = useRef<number>(0);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeImageRef = useRef<HTMLImageElement | null>(null);

  // Filter sample cases that have target anomalies
  const playableCases: GameCase[] = useRef(
    SAMPLE_CASES.filter((c) => c.targetAnomalyBox).map((c) => ({
      id: c.id,
      title: c.title,
      modality: c.modality,
      hint: c.groundTruthHint,
      dataUrl: c.generateDataUrl(),
      targetBox: c.targetAnomalyBox!,
    }))
  ).current;

  const currentCase = playableCases[currentCaseIndex % playableCases.length];

  // Preload current case image into ref
  useEffect(() => {
    if (!currentCase) return;
    const img = new Image();
    img.src = currentCase.dataUrl;
    img.onload = () => {
      activeImageRef.current = img;
    };
  }, [currentCaseIndex, currentCase]);

  // Main 60fps isolated Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];

    const loop = (now: number) => {
      const rawDt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      const dt = Math.min(rawDt, 0.05); // Clamp dt to prevent tunneling

      // Hitstop delay
      if (hitStopRef.current > 0) {
        hitStopRef.current -= dt;
        requestRef.current = requestAnimationFrame(loop);
        return;
      }

      // Camera shake decay
      if (cameraShakeRef.current > 0) {
        cameraShakeRef.current = Math.max(0, cameraShakeRef.current - dt * 25);
      }

      ctx.save();
      // Apply camera shake translation
      if (cameraShakeRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * cameraShakeRef.current * 12;
        const shakeY = (Math.random() - 0.5) * cameraShakeRef.current * 12;
        ctx.translate(shakeX, shakeY);
      }

      // Clear Canvas
      ctx.fillStyle = '#030508';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Grid / Clinical background
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // If in Playing state and image is ready, draw centered scan
      if (gameState === 'playing' && activeImageRef.current) {
        const img = activeImageRef.current;
        const aspect = img.width / img.height;
        const maxH = canvas.height * 0.78;
        const maxW = canvas.width * 0.78;
        let drawW = maxH * aspect;
        let drawH = maxH;
        if (drawW > maxW) {
          drawW = maxW;
          drawH = maxW / aspect;
        }
        const imgX = (canvas.width - drawW) / 2;
        const imgY = (canvas.height - drawH) / 2;

        ctx.drawImage(img, imgX, imgY, drawW, drawH);

        // Border around active medical scan
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(imgX, imgY, drawW, drawH);

        // Interactive Crosshair Reticle following mouse
        const mx = mousePosRef.current.x;
        const my = mousePosRef.current.y;

        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.5;

        // Circular reticle
        ctx.beginPath();
        ctx.arc(mx, my, 22, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#22d3ee';
        ctx.fill();

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(mx - 32, my);
        ctx.lineTo(mx - 10, my);
        ctx.moveTo(mx + 10, my);
        ctx.lineTo(mx + 32, my);
        ctx.moveTo(mx, my - 32);
        ctx.lineTo(mx, my - 10);
        ctx.moveTo(mx, my + 10);
        ctx.lineTo(mx, my + 32);
        ctx.stroke();
      }

      // Particles render & update
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.life -= dt * 2.5;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  // Spawn visual particles
  const spawnParticles = (x: number, y: number, color: string) => {
    // Canvas context particles
    // Can also trigger canvas confetti for major milestones
    soundFx.playSuccessChime();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused') setGameState('playing');
        else onExit();
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (gameState === 'title' || gameState === 'gameover' || gameState === 'victory') {
          startGame();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, onExit]);

  // Timer countdown while playing
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleTimeout();
          return 15;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, currentCaseIndex]);

  const startGame = () => {
    setScore(0);
    setStreak(0);
    setMultiplier(1);
    setLives(3);
    setCurrentCaseIndex(0);
    setTimeLeft(15);
    setGameState('playing');
    soundFx.playScanPing();
  };

  const handleTimeout = () => {
    soundFx.playBuzzer();
    cameraShakeRef.current = 1.2;
    setLives((l) => {
      const nextLives = l - 1;
      if (nextLives <= 0) {
        setGameState('gameover');
      }
      return nextLives;
    });
    setStreak(0);
    setMultiplier(1);
    setFeedbackFlash('miss');
    setHitMessage('TIME ELAPSED - ANOMALY MISSED');
    setTimeout(() => {
      setFeedbackFlash(null);
      setHitMessage('');
      setCurrentCaseIndex((idx) => idx + 1);
      setTimeLeft(15);
    }, 1000);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mousePosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing' || !currentCase || !activeImageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const img = activeImageRef.current;
    const aspect = img.width / img.height;
    const maxH = canvas.height * 0.78;
    const maxW = canvas.width * 0.78;
    let drawW = maxH * aspect;
    let drawH = maxH;
    if (drawW > maxW) {
      drawW = maxW;
      drawH = maxW / aspect;
    }
    const imgX = (canvas.width - drawW) / 2;
    const imgY = (canvas.height - drawH) / 2;

    // Check if clicked inside image
    if (clickX < imgX || clickX > imgX + drawW || clickY < imgY || clickY > imgY + drawH) {
      return;
    }

    // Convert click to normalized 0-1000 coordinates
    const normX = ((clickX - imgX) / drawW) * 1000;
    const normY = ((clickY - imgY) / drawH) * 1000;

    const [ymin, xmin, ymax, xmax] = currentCase.targetBox;
    // Allow slight tolerance radius around anomaly target box
    const tolerance = 60;
    const isHit =
      normX >= xmin - tolerance &&
      normX <= xmax + tolerance &&
      normY >= ymin - tolerance &&
      normY <= ymax + tolerance;

    if (isHit) {
      // Correct Identification!
      hitStopRef.current = 0.05; // 50ms simulation hitstop
      soundFx.playSuccessChime();
      setFeedbackFlash('hit');
      setHitMessage('ANOMALY IDENTIFIED! +350 PTS');

      const pts = 350 * multiplier + timeLeft * 10;
      const newScore = score + pts;
      setScore(newScore);
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('radquest_highscore', String(newScore));
      }

      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setMultiplier(Math.min(4, 1 + Math.floor(nextStreak / 2)));

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { x: clickX / window.innerWidth, y: clickY / window.innerHeight },
      });

      setTimeout(() => {
        setFeedbackFlash(null);
        setHitMessage('');
        if (currentCaseIndex + 1 >= playableCases.length * 2) {
          // Completed all cases twice
          setGameState('victory');
          confetti({ particleCount: 150, spread: 100 });
        } else {
          setCurrentCaseIndex((idx) => idx + 1);
          setTimeLeft(15);
        }
      }, 700);
    } else {
      // Missed / False Positive!
      cameraShakeRef.current = 1.0;
      soundFx.playBuzzer();
      setFeedbackFlash('miss');
      setHitMessage('FALSE POSITIVE - 1 LIFE LOST');
      setStreak(0);
      setMultiplier(1);
      setLives((l) => {
        const next = l - 1;
        if (next <= 0) {
          setGameState('gameover');
        }
        return next;
      });
      setTimeout(() => {
        setFeedbackFlash(null);
        setHitMessage('');
      }, 700);
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    soundFx.setMuted(nextMute);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none overflow-hidden font-sans">
      {/* 60fps Isolated Simulation Canvas Container */}
      <canvas
        ref={canvasRef}
        width={typeof window !== 'undefined' ? window.innerWidth : 1280}
        height={typeof window !== 'undefined' ? window.innerHeight : 800}
        onMouseMove={handleCanvasMouseMove}
        onClick={handleCanvasClick}
        className="absolute inset-0 w-full h-full cursor-none"
      />

      {/* World-Matched, Low-Occlusion UI (>85% unobstructed, pointer-events: none on wrapper) */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
        {/* TOP STATUS BAR CLUSTER */}
        <div className="flex items-center justify-between text-slate-300">
          <div className="flex items-center gap-4">
            <button
              onClick={onExit}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono rounded-lg border border-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>ESC / EXIT GAME</span>
            </button>

            <button
              onClick={toggleMute}
              className="pointer-events-auto p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded-lg border border-slate-800"
              title="Toggle Audio"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>

          {gameState === 'playing' && (
            <div className="flex items-center gap-6 bg-slate-950/80 px-5 py-2.5 rounded-xl border border-slate-800 backdrop-blur shadow-2xl">
              {/* Score cluster */}
              <div>
                <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Score</span>
                <span className="text-xl font-bold font-mono text-cyan-400 tabular-nums">
                  {score.toLocaleString()}
                </span>
              </div>

              {/* Multiplier Streak */}
              <div className="flex items-center gap-1.5 border-l border-slate-800 pl-4">
                <Flame className={`w-4 h-4 ${multiplier > 1 ? 'text-amber-400 animate-bounce' : 'text-slate-500'}`} />
                <span className="text-base font-bold font-mono text-amber-300 tabular-nums">
                  {multiplier}x
                </span>
              </div>

              {/* Lives */}
              <div className="flex items-center gap-1 border-l border-slate-800 pl-4">
                {[1, 2, 3].map((heart) => (
                  <Heart
                    key={heart}
                    className={`w-4 h-4 ${
                      heart <= lives ? 'text-rose-500 fill-rose-500' : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>

              {/* Timer Bar */}
              <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
                <Timer className={`w-4 h-4 ${timeLeft <= 5 ? 'text-rose-400 animate-ping' : 'text-cyan-400'}`} />
                <span
                  className={`text-lg font-bold font-mono tabular-nums ${
                    timeLeft <= 5 ? 'text-rose-400' : 'text-slate-200'
                  }`}
                >
                  {timeLeft}s
                </span>
              </div>
            </div>
          )}

          <div className="text-right font-mono text-xs text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
            HIGH: <strong className="text-cyan-400 tabular-nums">{highScore.toLocaleString()}</strong>
          </div>
        </div>

        {/* FEEDBACK FLASH / HIT MESSAGE */}
        {hitMessage && (
          <div className="flex justify-center my-auto pointer-events-none">
            <div
              className={`px-6 py-3 rounded-xl font-mono font-bold text-sm shadow-2xl border flex items-center gap-2 animate-bounce ${
                feedbackFlash === 'hit'
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-emerald-950'
                  : 'bg-rose-950/90 text-rose-300 border-rose-500/50 shadow-rose-950'
              }`}
            >
              {feedbackFlash === 'hit' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
              <span>{hitMessage}</span>
            </div>
          </div>
        )}

        {/* BOTTOM CLINICAL CLUE CLUSTER */}
        {gameState === 'playing' && currentCase && (
          <div className="flex items-end justify-between text-xs text-slate-300">
            <div className="bg-slate-950/85 p-3.5 rounded-xl border border-slate-800 backdrop-blur max-w-md pointer-events-none space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-[11px] font-semibold uppercase">
                <Target className="w-3.5 h-3.5" />
                <span>Case {currentCaseIndex + 1}: {currentCase.title}</span>
              </div>
              <p className="text-slate-400 text-xs">{currentCase.hint}</p>
            </div>

            <div className="font-mono text-[11px] text-slate-500 bg-slate-950/80 px-3 py-1.5 rounded border border-slate-800">
              Mouse Aim · Left Click to Pinpoint · Esc Pause
            </div>
          </div>
        )}
      </div>

      {/* GAME SHELL 1: TITLE SCREEN MODAL */}
      {gameState === 'title' && (
        <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-40">
          {/* Bespoke inline SVG Title Lockup with 30-40% negative space */}
          <div className="max-w-md w-full space-y-6">
            <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full animate-spin-slow" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" stroke="#0891b2" strokeWidth="2" strokeDasharray="6 4" fill="none" opacity="0.4" />
                <circle cx="60" cy="60" r="38" stroke="#22d3ee" strokeWidth="2" strokeDasharray="12 6" fill="none" opacity="0.6" />
                <circle cx="60" cy="60" r="24" stroke="#38bdf8" strokeWidth="2" fill="none" />
              </svg>
              <Target className="absolute w-10 h-10 text-cyan-400 animate-pulse" />
            </div>

            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-1">
                Clinical Vision Residency Training
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white font-mono">
                RAD<span className="text-cyan-400">QUEST</span>
              </h1>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Rapid Radiological Anomaly Hunt. Spot and pinpoint subtle pathology across Thoracic X-Rays,
                Brain MRIs, CT scans, and Dermoscopy before the clock drains.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={startGame}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm tracking-wide shadow-xl shadow-cyan-950 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>START CLINICAL SIMULATION (SPACE / ENTER)</span>
              </button>

              <div className="text-[11px] font-mono text-slate-500">
                Mouse Aim · Click to Pinpoint · Space Confirm · Esc Exit
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GAME SHELL 2: PAUSE MODAL */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-40">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold font-mono text-white">Simulation Paused</h2>
            <div className="space-y-2">
              <button
                onClick={() => setGameState('playing')}
                className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs"
              >
                Resume Reading
              </button>
              <button
                onClick={onExit}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs"
              >
                Exit to Workstation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME SHELL 3: GAME OVER MODAL */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center p-6 z-40">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full text-center space-y-5 shadow-2xl">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/40">
              <Heart className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-2xl font-bold font-mono text-white">Shift Concluded</h2>
              <p className="text-xs text-slate-400 mt-1">Diagnostic lives depleted. Review observations.</p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">FINAL SCORE</span>
                <strong className="text-xl text-cyan-400 tabular-nums">{score.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">CASES EVALUATED</span>
                <strong className="text-xl text-slate-200 tabular-nums">{currentCaseIndex}</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={startGame}
                className="flex-1 py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> Try Shift Again
              </button>
              <button
                onClick={onExit}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME SHELL 4: VICTORY MODAL */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center p-6 z-40">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 max-w-md w-full text-center space-y-5 shadow-2xl shadow-cyan-950">
            <div className="w-14 h-14 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center mx-auto border border-cyan-500/40 animate-pulse">
              <Trophy className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-2xl font-bold font-mono text-white">Fellowship Mastery!</h2>
              <p className="text-xs text-slate-300 mt-1">
                Completed all clinical modalities with stellar diagnostic accuracy.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">TOTAL SCORE</span>
                <strong className="text-xl text-cyan-400 tabular-nums">{score.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">HIGH SCORE</span>
                <strong className="text-xl text-amber-300 tabular-nums">{highScore.toLocaleString()}</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={startGame}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" /> Replay Rounds
              </button>
              <button
                onClick={onExit}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs"
              >
                Return to Workstation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
