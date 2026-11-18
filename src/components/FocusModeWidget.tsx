import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Volume2, Flame, CloudRain, Sparkles, Compass, Gauge, Clock, Coffee, Brain } from 'lucide-react';

type SoundscapePreset = 'rain' | 'binaural' | 'aurora' | 'crackle';

export default React.memo(function FocusModeWidget() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [isPlaying, setIsPlaying] = useState(false);
  const [preset, setPreset] = useState<SoundscapePreset>('rain');
  const [volume, setVolume] = useState(0.5);
  const [intensity, setIntensity] = useState(1.0);
  const [focusedTime, setFocusedTime] = useState(0);

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nodesRef = useRef<any[]>([]); // To store all active nodes for easy teardown
  const intervalsRef = useRef<number[]>([]); // For crackle/intervals
  const timerRef = useRef<any>(null); // For counting up focus duration

  // Canvas ref for visualizer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Start focus timer when playing
  useEffect(() => {
    if (isPlaying) {
      setFocusedTime(0);
      timerRef.current = setInterval(() => {
        setFocusedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying]);

  const drawIdleWave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    const height = (canvas.height = 75);
    canvasCtx.clearRect(0, 0, width, height);
    canvasCtx.lineWidth = 1.5;
    canvasCtx.strokeStyle = 'rgba(161, 161, 170, 0.255)';
    canvasCtx.shadowBlur = 0;
    canvasCtx.beginPath();

    for (let xPos = 0; xPos < width; xPos++) {
      const progress = xPos / width;
      const y = height / 2 + Math.sin(progress * Math.PI * 4) * 2.5 * Math.sin(progress * Math.PI);
      if (xPos === 0) {
        canvasCtx.moveTo(xPos, y);
      } else {
        canvasCtx.lineTo(xPos, y);
      }
    }
    canvasCtx.stroke();
  };

  // Clean up audio nodes and interval triggers on state change or unmount
  const stopAudio = () => {
    isPlayingRef.current = false;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clear crackling popping intervals
    intervalsRef.current.forEach((id) => clearInterval(id));
    intervalsRef.current = [];

    // Stop and disconnect all generators
    nodesRef.current.forEach((node) => {
      try {
        node.stop();
      } catch (e) {
        // Source node might already be stopped or is not a stopable type
      }
      try {
        node.disconnect();
      } catch (e) {
        // Already disconnected or failed
      }
    });
    nodesRef.current = [];

    if (masterGainRef.current) {
      try {
        masterGainRef.current.disconnect();
      } catch (e) {}
      masterGainRef.current = null;
    }

    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }

    setIsPlaying(false);
    drawIdleWave();
  };

  // Synchronize master gain with slider volume
  useEffect(() => {
    if (masterGainRef.current && audioContextRef.current) {
      masterGainRef.current.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
    }
  }, [volume]);

  // Dynamic volume adjustment for specific generator parameters on intensity change
  useEffect(() => {
    if (isPlaying) {
      // Restart generator with the new intensity in real time
      stopAudio();
      setTimeout(() => {
        startAudio();
      }, 50);
    }
  }, [intensity, preset]);

  // Draw static idle wave once on mount and clean up on component unmount
  useEffect(() => {
    drawIdleWave();
    return () => {
      stopAudio();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  const createWhiteNoiseBuffer = (ctx: AudioContext, seconds: number) => {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  const startAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      // Master Gain setup
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, ctx.currentTime);
      masterGainRef.current = masterGain;

      // Analyser setup
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      masterGain.connect(analyser);
      analyser.connect(ctx.destination);

      // Start specific presets
      if (preset === 'rain') {
        // Soft Rain Noise
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = createWhiteNoiseBuffer(ctx, 3);
        noiseSource.loop = true;

        const rainFilter = ctx.createBiquadFilter();
        rainFilter.type = 'bandpass';
        rainFilter.frequency.setValueAtTime(1000, ctx.currentTime);
        rainFilter.Q.setValueAtTime(0.5, ctx.currentTime);

        const volumeMultiplier = ctx.createGain();
        volumeMultiplier.gain.setValueAtTime(0.25 * intensity, ctx.currentTime);

        noiseSource.connect(rainFilter);
        rainFilter.connect(volumeMultiplier);
        volumeMultiplier.connect(masterGain);

        noiseSource.start();
        nodesRef.current.push(noiseSource, rainFilter, volumeMultiplier);

        // Low Rolling Thunder drone
        const thunderOsc = ctx.createOscillator();
        thunderOsc.type = 'triangle';
        thunderOsc.frequency.setValueAtTime(45, ctx.currentTime);

        const thunderGain = ctx.createGain();
        thunderGain.gain.setValueAtTime(0, ctx.currentTime);

        // Slow gain change LFO to simulate thunder roll
        const thunderLfo = ctx.createOscillator();
        thunderLfo.type = 'sine';
        thunderLfo.frequency.setValueAtTime(0.05 * intensity, ctx.currentTime);

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.08 * intensity, ctx.currentTime);

        thunderLfo.connect(lfoGain);
        lfoGain.connect(thunderGain.gain);
        thunderOsc.connect(thunderGain);
        thunderGain.connect(masterGain);

        thunderLfo.start();
        thunderOsc.start();
        nodesRef.current.push(thunderLfo, lfoGain, thunderOsc, thunderGain);

      } else if (preset === 'binaural') {
        // Left Ear Oscillator (200Hz)
        const leftOsc = ctx.createOscillator();
        leftOsc.type = 'sine';
        leftOsc.frequency.setValueAtTime(160, ctx.currentTime);

        const leftPan = ctx.createStereoPanner();
        leftPan.pan.setValueAtTime(-1, ctx.currentTime);

        const leftGain = ctx.createGain();
        leftGain.gain.setValueAtTime(0.12, ctx.currentTime);

        leftOsc.connect(leftGain);
        leftGain.connect(leftPan);
        leftPan.connect(masterGain);

        leftOsc.start();
        nodesRef.current.push(leftOsc, leftGain, leftPan);

        // Right Ear Oscillator (160Hz + 6Hz Theta stimulation)
        const rightOsc = ctx.createOscillator();
        rightOsc.type = 'sine';
        rightOsc.frequency.setValueAtTime(160 + (6 * intensity), ctx.currentTime);

        const rightPan = ctx.createStereoPanner();
        rightPan.pan.setValueAtTime(1, ctx.currentTime);

        const rightGain = ctx.createGain();
        rightGain.gain.setValueAtTime(0.12, ctx.currentTime);

        rightOsc.connect(rightGain);
        rightGain.connect(rightPan);
        rightPan.connect(masterGain);

        rightOsc.start();
        nodesRef.current.push(rightOsc, rightGain, rightPan);

        // Cosmic swell pad mapping deep theta brainwave state
        const slowSwellLfo = ctx.createOscillator();
        slowSwellLfo.type = 'sine';
        slowSwellLfo.frequency.setValueAtTime(0.04 * intensity, ctx.currentTime);

        const swellGainNode = ctx.createGain();
        swellGainNode.gain.setValueAtTime(0.04 * intensity, ctx.currentTime);

        const padOsc = ctx.createOscillator();
        padOsc.type = 'triangle';
        padOsc.frequency.setValueAtTime(240, ctx.currentTime); // Chord foundation

        const padGain = ctx.createGain();
        padGain.gain.setValueAtTime(0.05, ctx.currentTime);

        slowSwellLfo.connect(swellGainNode);
        swellGainNode.connect(padGain.gain);

        padOsc.connect(padGain);
        padGain.connect(masterGain);

        slowSwellLfo.start();
        padOsc.start();
        nodesRef.current.push(slowSwellLfo, swellGainNode, padOsc, padGain);

      } else if (preset === 'aurora') {
        const chord = [261.63, 311.13, 392.00, 466.16]; // Beautiful C minor 7 chord (C, Eb, G, Bb)

        chord.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);

          // Subtle detuning for ambient drift
          osc.detune.setValueAtTime((Math.random() * 8) - 4, ctx.currentTime);

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(300, ctx.currentTime);
          filter.Q.setValueAtTime(2.5, ctx.currentTime);

          const lfo = ctx.createOscillator();
          lfo.type = 'sine';
          lfo.frequency.setValueAtTime(0.03 + (index * 0.01) * intensity, ctx.currentTime);

          const lfoGain = ctx.createGain();
          lfoGain.gain.setValueAtTime(200, ctx.currentTime);

          const panner = ctx.createStereoPanner();
          panner.pan.setValueAtTime(index % 2 === 0 ? -0.6 : 0.6, ctx.currentTime);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.04, ctx.currentTime);

          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);

          osc.connect(filter);
          filter.connect(panner);
          panner.connect(gain);
          gain.connect(masterGain);

          lfo.start();
          osc.start();
          nodesRef.current.push(lfo, lfoGain, osc, filter, panner, gain);
        });

      } else if (preset === 'crackle') {
        // Base low fire hum noise
        const fireNoise = ctx.createBufferSource();
        fireNoise.buffer = createWhiteNoiseBuffer(ctx, 4);
        fireNoise.loop = true;

        const fireFilter = ctx.createBiquadFilter();
        fireFilter.type = 'lowpass';
        fireFilter.frequency.setValueAtTime(140, ctx.currentTime);

        const fireGain = ctx.createGain();
        fireGain.gain.setValueAtTime(0.20, ctx.currentTime);

        fireNoise.connect(fireFilter);
        fireFilter.connect(fireGain);
        fireGain.connect(masterGain);

        fireNoise.start();
        nodesRef.current.push(fireNoise, fireFilter, fireGain);

        // Crackling sparks loop
        const triggerCrackle = () => {
          if (ctx.state === 'closed') return;
          const popOsc = ctx.createOscillator();
          popOsc.type = 'sine';
          popOsc.frequency.setValueAtTime(1200 + Math.random() * 2200, ctx.currentTime);

          const popGain = ctx.createGain();
          popGain.gain.setValueAtTime(0, ctx.currentTime);
          popGain.gain.linearRampToValueAtTime(0.06 * intensity, ctx.currentTime + 0.001);
          popGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.01 + Math.random() * 0.02);

          popOsc.connect(popGain);
          popGain.connect(masterGain);

          popOsc.start();
          popOsc.stop(ctx.currentTime + 0.05);
        };

        const intervalId = window.setInterval(() => {
          if (Math.random() < 0.65) {
            triggerCrackle();
            if (Math.random() < 0.3) {
              // Rapid twin sparks
              setTimeout(triggerCrackle, 30 + Math.random() * 50);
            }
          }
        }, 150);

        intervalsRef.current.push(intervalId);
      }

      isPlayingRef.current = true;
      setIsPlaying(true);
      startVisualizer();
    } catch (e) {
      console.error('Focus Audio creation failed:', e);
    }
  };

  const handleToggleFocusMode = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      startAudio();
    }
  };

  // Canvas Waveform visual animation loop (only runs while audio is actively playing & tab is visible)
  const startVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    const width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    const height = (canvas.height = 75);

    let phase = 0;

    const draw = () => {
      if (!isPlayingRef.current) {
        animationFrameRef.current = null;
        return;
      }

      animationFrameRef.current = requestAnimationFrame(draw);

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      phase += 0.06;
      canvasCtx.clearRect(0, 0, width, height);

      if (analyser) {
        analyser.getByteTimeDomainData(dataArray);

        // Draw multiple beautiful glowing layers
        canvasCtx.lineWidth = 2.5;

        // Indigo Layer
        canvasCtx.strokeStyle = 'rgba(99, 102, 241, 0.75)';
        canvasCtx.shadowBlur = 12;
        canvasCtx.shadowColor = 'rgba(99, 102, 241, 0.4)';
        canvasCtx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            canvasCtx.moveTo(x, y);
          } else {
            canvasCtx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        canvasCtx.lineTo(width, height / 2);
        canvasCtx.stroke();

        // Secondary Violet layer for deep depth
        canvasCtx.beginPath();
        canvasCtx.lineWidth = 1.2;
        canvasCtx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        canvasCtx.shadowBlur = 0;
        x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          // Apply some phase delay for organic motion
          const phaseOffset = Math.sin((i / bufferLength) * Math.PI * 2 + phase) * 6;
          const y = (v * height) / 2 + phaseOffset;

          if (i === 0) {
            canvasCtx.moveTo(x, y);
          } else {
            canvasCtx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        canvasCtx.stroke();
      }
    };

    draw();
  };

  // Convert seconds to MM:SS format
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel text-left p-6 rounded-[2.2rem] hover:bg-white/50 dark:hover:bg-zinc-900/40 transition-all duration-300 relative overflow-hidden flex flex-col h-full border border-zinc-200/60 dark:border-zinc-800/80 hover:shadow-xl hover:shadow-indigo-500/8 hover:border-zinc-300/80 dark:hover:border-zinc-700/80" id="focus-mode-sounds-container">
      {/* Visual Ambient Background Circle */}
      {isPlaying && (
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 blur-3xl pointer-events-none"
        />
      )}

      {/* Widget Header Row */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-purple-500/10 border border-indigo-500/20 dark:border-purple-500/20 flex items-center justify-center shrink-0 shadow-xs text-indigo-600 dark:text-indigo-400">
            <Brain size={18} className={isPlaying ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight font-sans flex items-center gap-2">
              {isZh ? '專注模式背景音樂合成器' : 'Focus Mode Ambient Synth'}
              {isPlaying && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold tracking-widest uppercase animate-pulse">
                  ● {isZh ? '正在播放' : 'ACTIVE'}
                </span>
              )}
            </h3>
            <p className="text-[10.5px] text-zinc-400 dark:text-zinc-500 font-medium">
              {isZh ? '播放即時生成的輕柔環境音，幫助您操作 AI 工具時保持高度專注' : 'Play light, real-time synthesized soundscapes to elevate concentration'}
            </p>
          </div>
        </div>

        {/* Stopwatch Active Focus Indicator */}
        {isPlaying && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/5 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/50 dark:border-zinc-700/30 text-[10.5px] font-mono font-bold text-zinc-700 dark:text-zinc-300">
            <Clock size={11} className="text-zinc-500 animate-spin-slow" />
            <span>{isZh ? '已專注時間：' : 'FOCUSED: '}</span>
            <span className="text-indigo-600 dark:text-indigo-400">{formatTime(focusedTime)}</span>
          </div>
        )}
      </div>

      {/* Live Audio Visualizer Row */}
      <div className="w-full bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/50 dark:border-zinc-850/60 rounded-2xl py-3 px-4 mb-4 flex items-center justify-center relative overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-[65px]" />
        {!isPlaying && (
          <div className="absolute inset-0 bg-zinc-50/10 dark:bg-zinc-950/20 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none">
            <span className="text-[10px] font-mono tracking-wider text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-1.5 select-none">
              <Coffee size={11} /> {isZh ? '音軌環境波閒置中 • 點選下方按鈕開始專注' : 'Audio wave idle • Start focus mode'}
            </span>
          </div>
        )}
      </div>

      {/* Preset Custom Buttons Selector */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {/* presets */}
        <button
          onClick={() => setPreset('rain')}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-bold tracking-tight text-left border cursor-pointer transition-all ${
            preset === 'rain'
              ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
              : 'bg-white/40 dark:bg-zinc-900/20 border-zinc-200/40 dark:border-zinc-800/40 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 hover:border-zinc-300 dark:hover:text-zinc-300 dark:hover:border-zinc-700'
          }`}
          type="button"
        >
          <CloudRain size={14} className={preset === 'rain' && isPlaying ? 'animate-bounce text-indigo-500' : 'text-zinc-450'} />
          <div className="leading-tight">
            <div className="font-semibold text-zinc-800 dark:text-zinc-200">{isZh ? '大自然細雨低音' : 'Gentle Rain & Bass'}</div>
            <div className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 mt-0.5">{isZh ? '消除疲勞的擬真落雨及舒適低頻震動' : 'Hydrating soundscape & sub rumble'}</div>
          </div>
        </button>

        <button
          onClick={() => setPreset('binaural')}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-bold tracking-tight text-left border cursor-pointer transition-all ${
            preset === 'binaural'
              ? 'bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300 font-bold shadow-2xs'
              : 'bg-white/40 dark:bg-zinc-900/20 border-zinc-200/40 dark:border-zinc-800/40 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 hover:border-zinc-300 dark:hover:text-zinc-300 dark:hover:border-zinc-700'
          }`}
          type="button"
        >
          <Brain size={14} className={preset === 'binaural' && isPlaying ? 'animate-pulse text-purple-500' : 'text-zinc-450'} />
          <div className="leading-tight">
            <div className="font-semibold text-zinc-800 dark:text-zinc-200">{isZh ? '雙耳節拍深度專注' : 'Binaural Deep Focus'}</div>
            <div className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 mt-0.5">{isZh ? '希塔波 (Theta 6Hz) 頻率腦波深化刺激' : 'Theta frequencies stimulation'}</div>
          </div>
        </button>

        <button
          onClick={() => setPreset('aurora')}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-bold tracking-tight text-left border cursor-pointer transition-all ${
            preset === 'aurora'
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold shadow-2xs'
              : 'bg-white/40 dark:bg-zinc-900/20 border-zinc-200/40 dark:border-zinc-800/40 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 hover:border-zinc-300 dark:hover:text-zinc-300 dark:hover:border-zinc-700'
          }`}
          type="button"
        >
          <Compass size={14} className={preset === 'aurora' && isPlaying ? 'animate-spin-slow text-amber-500' : 'text-zinc-450'} />
          <div className="leading-tight">
            <div className="font-semibold text-zinc-800 dark:text-zinc-200">{isZh ? '太空極光氛圍音襯' : 'Cosmic Aurora Pad'}</div>
            <div className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 mt-0.5">{isZh ? '優雅而漸強漸慢、具有舒展感的虛空氛圍音' : 'Floating, swelling space drone'}</div>
          </div>
        </button>

        <button
          onClick={() => setPreset('crackle')}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-bold tracking-tight text-left border cursor-pointer transition-all ${
            preset === 'crackle'
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300 font-bold shadow-2xs'
              : 'bg-white/40 dark:bg-zinc-900/20 border-zinc-200/40 dark:border-zinc-800/40 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 hover:border-zinc-300 dark:hover:text-zinc-300 dark:hover:border-zinc-700'
          }`}
          type="button"
        >
          <Flame size={14} className={preset === 'crackle' && isPlaying ? 'animate-pulse text-rose-550' : 'text-zinc-450'} />
          <div className="leading-tight">
            <div className="font-semibold text-zinc-800 dark:text-zinc-200">{isZh ? '暖心營火劈啪聲' : 'Campfire Crackle'}</div>
            <div className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 mt-0.5">{isZh ? '溫暖舒適的木柴碎裂與微小火花蹦跳聲' : 'Warm cozy fire pops & spark hums'}</div>
          </div>
        </button>
      </div>

      {/* Control sliders: Volume & Pacing */}
      <div className="flex flex-col sm:flex-row gap-5 items-stretch sm:items-center justify-between border-t border-zinc-200/20 dark:border-zinc-800/20 pt-4 mb-5">
        {/* Slider 1: Master Volume */}
        <div className="flex-1 flex items-center gap-3.5 select-none">
          <Volume2 size={14} className="text-zinc-450 dark:text-zinc-500 shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-450 dark:text-zinc-550 leading-none">
              <span>{isZh ? '合成器音量' : 'VOLUME'}</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-0"
              aria-label="Volume level"
            />
          </div>
        </div>

        {/* Slider 2: Sound intensity pacing */}
        <div className="flex-1 flex items-center gap-3.5 select-none">
          <Gauge size={14} className="text-zinc-450 dark:text-zinc-500 shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-450 dark:text-zinc-550 leading-none">
              <span>{isZh ? '環境節奏與強度' : 'INTENSITY PACING'}</span>
              <span>x{intensity.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="2.0"
              step="0.1"
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none focus:ring-0"
              aria-label="Soundscape intensity pacing"
            />
          </div>
        </div>
      </div>

      {/* Core Toggle button */}
      <div className="w-full">
        <button
          onClick={handleToggleFocusMode}
          className={`w-full py-3 px-5 rounded-2xl text-xs font-bold font-sans tracking-wide transition-all duration-300 transform active:scale-97 cursor-pointer flex items-center justify-center gap-2 ${
            isPlaying
              ? 'bg-red-500/10 hover:bg-red-500/15 border border-red-500/35 text-red-650 dark:text-red-400 hover:scale-[1.015]'
              : 'bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 text-white shadow-lg shadow-indigo-600/10 dark:shadow-indigo-500/10 hover:scale-[1.015]'
          }`}
          type="button"
        >
          {isPlaying ? (
            <>
              <Square size={14} fill="currentColor" />
              <span>{isZh ? '停止環境音播放' : 'Stop Focus Soundscape'}</span>
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" />
              <span>{isZh ? '開始專注環境音模式' : 'Start Focus Soundscape Session'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});
