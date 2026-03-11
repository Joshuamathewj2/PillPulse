/**
 * PillPulse Escalation Engine
 */

// ── DEV MODE toggle ──────────────────────────────────────
let devMode = false;
const API_URL = (import.meta as any).env.VITE_API_URL || 'https://pillpulse-backend.onrender.com';

export function setDevMode(enabled: boolean) {
  devMode = enabled;
  window.dispatchEvent(new CustomEvent('pillpulse-dev-mode-changed', {
    detail: { devMode }
  }));
}

export function getDevMode() {
  return devMode;
}

function getEscalationDelay() {
  return devMode ? 5 * 1000 : 15 * 60 * 1000; // 5s vs 15min
}

interface DoseEntry {
  medicineId: string;
  medicineName: string;
  timingSlot: string;
  status: string;
  timestamp: string;
  skipCount?: number;
  escalatedTo?: string[];
}

interface Caregiver {
  name: string;
  token?: string;
}

// ── Escalation Engine Class ──────────────────────────────
export class EscalationEngine {
  timers: Record<string, any> = {};
  doseLog: DoseEntry[] = [];
  caregivers: Caregiver[] = [];
  onDoseLogUpdate: ((log: DoseEntry[]) => void) | null = null;
  skipCounts: Record<string, number> = {};
  swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    try {
      const stored = JSON.parse(localStorage.getItem('pillpulse_dose_log') || '[]');
      this.doseLog = stored;
    } catch (_e) {
      this.doseLog = [];
    }
    
    // Auto-register service worker on load if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        this.swRegistration = reg;
      });
    }
  }

  setSWRegistration(reg: ServiceWorkerRegistration) {
    this.swRegistration = reg;
  }

  showNotification(title: string, options: any) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      if (this.swRegistration) {
        this.swRegistration.showNotification(title, options);
      } else {
        new Notification(title, options);
      }
    } catch (e) {
      console.error('Notification error:', e);
      // Fallback for mobile where new Notification() might fail
      if (this.swRegistration) {
         this.swRegistration.showNotification(title, options);
      }
    }
  }

  _setTimer(key: string, delay: number, name: string, callback: () => void) {
    this._clearTimer(key);
    const id = setTimeout(() => {
      delete this.timers[key];
      this._emitTimerUpdate();
      callback();
    }, delay);
    this.timers[key] = { id, targetTime: Date.now() + delay, name };
    this._emitTimerUpdate();
  }

  _clearTimer(key: string) {
    if (this.timers[key]) {
      clearTimeout(this.timers[key].id);
      delete this.timers[key];
      this._emitTimerUpdate();
    }
  }

  _clearTimersForDose(medicineId: string, timingSlot: string) {
    const prefix = `${medicineId}_${timingSlot}`;
    Object.keys(this.timers).forEach(k => {
      if (k.startsWith(prefix)) {
        this._clearTimer(k);
      }
    });
  }

  _emitTimerUpdate() {
    window.dispatchEvent(new CustomEvent('pillpulse-timers-updated', {
      detail: { timers: this.timers }
    }));
  }

  getTimers() {
    return this.timers;
  }

  scheduleDose(medicineId: string, medicineName: string, timingSlot: string, caregivers: Caregiver[]) {
    const msUntil = devMode ? 0 : this.msUntilTime(timingSlot);
    if (msUntil < 0) return;

    this._setTimer(
      `${medicineId}_${timingSlot}`, 
      msUntil, 
      `Dose: ${medicineName}`, 
      () => this.fireDoseNotification(medicineId, medicineName, timingSlot, caregivers)
    );
  }

  fireDoseNotification(medicineId: string, medicineName: string, timingSlot: string, caregivers: Caregiver[]) {
    if ('Notification' in window && Notification.permission === 'granted') {
      this.showNotification(`\ud83d\udc8a Time for ${medicineName}`, {
        body: `${timingSlot} — Tap to confirm`,
        icon: '/logo.png',
        requireInteraction: true,
        tag: `dose_${medicineId}_${timingSlot}`,
      });
    }

    window.dispatchEvent(new CustomEvent('pillpulse-dose-alert', {
      detail: {
        type: 'dose',
        level: 0,
        medicineId,
        medicineName,
        timingSlot,
        caregivers,
        message: `Time for ${medicineName}`,
        actions: ['taken', 'snooze', 'skip']
      }
    }));

    const escalationDelay = getEscalationDelay();
    this._setTimer(
      `${medicineId}_${timingSlot}_escalation`,
      escalationDelay,
      `Reminder: ${medicineName}`,
      () => this.checkAndEscalate(medicineId, medicineName, timingSlot, caregivers, 1)
    );
  }

  markTaken(medicineId: string, medicineName: string, timingSlot: string) {
    this._clearTimersForDose(medicineId, timingSlot);
    this.skipCounts[medicineId] = 0;
    this.logDose({
      medicineId,
      medicineName,
      timingSlot,
      status: 'taken',
      timestamp: new Date().toISOString()
    });

    if ('Notification' in window && Notification.permission === 'granted') {
      this.showNotification('\u2705 Dose Confirmed', {
        body: `${medicineName} marked as taken. Great job!`,
        icon: '/logo.png',
        tag: `confirm_${medicineId}`,
      });
    }
  }

  snooze(medicineId: string, medicineName: string, timingSlot: string, caregivers: Caregiver[]) {
    this._clearTimersForDose(medicineId, timingSlot);
    this.logDose({
      medicineId,
      medicineName,
      timingSlot,
      status: 'snoozed',
      timestamp: new Date().toISOString()
    });

    const snoozeDelay = getEscalationDelay();
    this._setTimer(
      `${medicineId}_${timingSlot}_snooze`,
      snoozeDelay,
      `Snoozed: ${medicineName}`,
      () => this.fireDoseNotification(medicineId, medicineName, timingSlot, caregivers)
    );

    if ('Notification' in window && Notification.permission === 'granted') {
      this.showNotification('\u23f0 Snoozed', {
        body: `Reminder for ${medicineName} in ${devMode ? '5 seconds' : '15 minutes'}`,
        icon: '/logo.png',
        tag: `snooze_${medicineId}`,
      });
    }
  }

  markSkipped(medicineId: string, medicineName: string, timingSlot: string, caregivers: Caregiver[]) {
    this._clearTimersForDose(medicineId, timingSlot);
    const SKIP_LIMIT = devMode ? 2 : 3;
    if (!this.skipCounts[medicineId]) this.skipCounts[medicineId] = 0;
    this.skipCounts[medicineId]++;
    const skipCount = this.skipCounts[medicineId];

    this.logDose({
      medicineId,
      medicineName,
      timingSlot,
      status: 'skipped',
      skipCount,
      timestamp: new Date().toISOString()
    });

    if (skipCount < SKIP_LIMIT) {
      const remaining = SKIP_LIMIT - skipCount;
      if ('Notification' in window && Notification.permission === 'granted') {
        this.showNotification('\u26a0\ufe0f Dose Skipped', {
          body: `${medicineName} skipped. Skip ${remaining} more time(s) and your caregiver will be notified.`,
          icon: '/logo.png',
          tag: `skip_${medicineId}`
        });
      }
      const delay = getEscalationDelay();
      this._setTimer(
        `${medicineId}_${timingSlot}_skip_remind`,
        delay,
        `Retrying skip: ${medicineName}`,
        () => this.fireDoseNotification(medicineId, medicineName, timingSlot, caregivers)
      );
    } else {
      if (caregivers && caregivers.length > 0) {
        this.escalateToCaregivers(medicineId, medicineName, timingSlot, caregivers, skipCount);
      }
      this.skipCounts[medicineId] = 0;
    }
  }

  escalateToCaregivers(medicineId: string, medicineName: string, timingSlot: string, caregivers: Caregiver[], skipCount: number) {
    if ('Notification' in window && Notification.permission === 'granted') {
      this.showNotification('\ud83d\udce2 Caregiver Notified', {
        body: `You've skipped ${medicineName} ${skipCount} times. Your caregiver has been alerted.`,
        icon: '/logo.png',
        requireInteraction: true
      });
    }
    caregivers.forEach(caregiver => {
      const patientCode = localStorage.getItem('pillpulse_patient_code') || '';
      fetch(`${API_URL}/api/notify-caregiver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientCode, medicineName, timingSlot, skipCount })
      });
    });
    this.logDose({
      medicineId, medicineName, timingSlot,
      status: 'escalated', skipCount,
      escalatedTo: caregivers.map(c => c.name),
      timestamp: new Date().toISOString()
    });
  }

  checkAndEscalate(medicineId: string, medicineName: string, timingSlot: string, caregivers: Caregiver[], level: number) {
    const todayDate = new Date().toISOString().split('T')[0];
    const alreadyTaken = this.doseLog.find(d => d.medicineId === medicineId && d.timingSlot === timingSlot && d.status === 'taken' && d.timestamp.startsWith(todayDate));
    if (alreadyTaken) return;

    if (level === 1) {
      if ('Notification' in window && Notification.permission === 'granted') {
        this.showNotification('\u26a0\ufe0f Reminder: ${medicineName}', {
          body: `You haven't confirmed your ${medicineName} dose. Please take your medicine now.`,
          icon: '/logo.png',
          requireInteraction: true,
          tag: `reminder_${medicineId}_${timingSlot}`,
        });
      }
      window.dispatchEvent(new CustomEvent('pillpulse-dose-alert', {
        detail: { type: 'reminder', level: 1, medicineId, medicineName, timingSlot, caregivers, message: `Reminder: You haven't confirmed your ${medicineName} dose`, actions: ['taken', 'skip'] }
      }));
      const escalationDelay = getEscalationDelay();
      this._setTimer(`${medicineId}_${timingSlot}_escalation_l2`, escalationDelay, `Caregiver Alert: ${medicineName}`, () => this.checkAndEscalate(medicineId, medicineName, timingSlot, caregivers, 2));
    } else if (level === 2) {
      if (caregivers) caregivers.forEach(c => this.notifyCaregiver(c, medicineName, timingSlot));
      this.logDose({ medicineId, medicineName, timingSlot, status: 'missed', escalatedTo: caregivers ? caregivers.map(c => c.name) : [], timestamp: new Date().toISOString() });
      window.dispatchEvent(new CustomEvent('pillpulse-dose-alert', {
        detail: { type: 'missed', level: 2, medicineId, medicineName, timingSlot, caregivers, message: `${medicineName} dose marked as MISSED. Caregivers notified.`, actions: [] }
      }));
    }
  }

  notifyCaregiver(caregiver: Caregiver, medicineName: string, timingSlot: string) {
    const patientCode = localStorage.getItem('pillpulse_patient_code') || '';
    fetch(`${API_URL}/api/notify-caregiver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientCode, medicineName, timingSlot })
    });
  }

  logDose(entry: DoseEntry) {
    this.doseLog.push(entry);
    try { localStorage.setItem('pillpulse_dose_log', JSON.stringify(this.doseLog)); } catch (_e) {}
    const patientCode = localStorage.getItem('pillpulse_patient_code') || '';
    if (patientCode) {
      fetch(`${API_URL}/api/log-dose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientCode, medicineName: entry.medicineName, timingSlot: entry.timingSlot, status: entry.status, timestamp: entry.timestamp })
      });
    }
    if (this.onDoseLogUpdate) this.onDoseLogUpdate([...this.doseLog]);
    window.dispatchEvent(new CustomEvent('pillpulse-dose-log-updated', { detail: { log: [...this.doseLog] } }));
  }

  getDoseLog() { return [...this.doseLog]; }
  clearDoseLog() { this.doseLog = []; localStorage.removeItem('pillpulse_dose_log'); if (this.onDoseLogUpdate) this.onDoseLogUpdate([]); }
  cancelAll() { Object.keys(this.timers).forEach(k => this._clearTimer(k)); this.timers = {}; this._emitTimerUpdate(); }

  msUntilTime(timeString: string) {
    const now = new Date();
    const target = new Date();
    const match = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return -1;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    target.setHours(hours, minutes, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target.getTime() - now.getTime();
  }
}

export const escalationEngine = new EscalationEngine();
