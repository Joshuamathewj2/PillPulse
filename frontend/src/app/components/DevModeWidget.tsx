import React, { useState, useEffect } from 'react';
import { Zap, ZapOff, Clock } from 'lucide-react';
import { getDevMode, setDevMode, escalationEngine } from '../../escalationEngine';

export default function DevModeWidget() {
  // Sync state initially with getDevMode()
  const [isDevMode, setIsDevMode] = useState(getDevMode());
  const [nextTimer, setNextTimer] = useState<{ name: string; remaining: number } | null>(null);

  // Listen to external dev mode toggles (e.g. from PrescriptionUpload.tsx)
  useEffect(() => {
    const handleDevModeChange = (e: any) => {
      setIsDevMode(e.detail.devMode);
    };

    window.addEventListener('pillpulse-dev-mode-changed', handleDevModeChange);
    return () => window.removeEventListener('pillpulse-dev-mode-changed', handleDevModeChange);
  }, []);

  // Update devMode from regular polling in case the event was missed
  useEffect(() => {
    const intervalId = setInterval(() => {
        setIsDevMode(getDevMode());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Countdown logic
  useEffect(() => {
    if (!isDevMode) {
      setNextTimer(null);
      return;
    }

    const updateTimers = () => {
      const timers = escalationEngine.getTimers();
      const now = Date.now();
      
      let nextTarget = Infinity;
      let nextName = '';

      // Find the most imminent timer
      Object.values(timers).forEach((t: any) => {
        if (t.targetTime && t.targetTime > now && t.targetTime < nextTarget) {
          nextTarget = t.targetTime;
          nextName = t.name;
        }
      });

      if (nextTarget !== Infinity) {
        setNextTimer({ name: nextName, remaining: Math.max(0, Math.ceil((nextTarget - now) / 1000)) });
      } else {
        setNextTimer(null);
      }
    };

    // Calculate immediately and every 1s
    updateTimers();
    const interval = setInterval(updateTimers, 200); // 200ms for smooth countdown

    const handleTimersChange = () => {
      updateTimers();
    };
    window.addEventListener('pillpulse-timers-updated', handleTimersChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('pillpulse-timers-updated', handleTimersChange);
    };
  }, [isDevMode]);

  const toggleMode = () => {
    const newMode = !isDevMode;
    setDevMode(newMode);
    setIsDevMode(newMode);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none">
      {isDevMode && nextTimer && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-5 py-3 rounded-2xl shadow-xl border border-orange-400 font-mono text-sm flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 pointer-events-auto">
          <Clock className="w-5 h-5 animate-pulse" />
          <span className="font-semibold tracking-wide">{nextTimer.name}</span>
          <span className="font-bold text-xl bg-black/20 px-2 py-0.5 rounded shadow-inner">
            {nextTimer.remaining}s
          </span>
        </div>
      )}
      
      <button
        onClick={toggleMode}
        title="Toggle DEV MODE"
        className={`flex items-center gap-2 px-6 py-3 rounded-full shadow-2xl transition-all border-2 font-bold pointer-events-auto ${
          isDevMode 
            ? 'bg-orange-500 text-white border-orange-400 hover:bg-orange-600 ring-4 ring-orange-500/30' 
            : 'bg-white text-gray-400 border-gray-200 hover:text-orange-500 hover:border-orange-200 hover:shadow-lg'
        }`}
      >
        {isDevMode ? (
          <><Zap className="w-5 h-5 fill-current" /> SYSTEM: DEV MODE</>
        ) : (
          <><ZapOff className="w-5 h-5" /> DEV MODE: OFF</>
        )}
      </button>
    </div>
  );
}
