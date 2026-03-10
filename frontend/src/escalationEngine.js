/**
 * PillPulse Escalation Engine
 * 
 * Manages the full dose notification + escalation workflow:
 *   Level 0 — Patient notification at scheduled time
 *   Level 1 — Reminder if no response / skip after 15 min
 *   Level 2 — Caregiver notification after another 15 min
 *   Level 3 — Log as missed dose
 * 
 * DEV MODE: Set devMode = true to use faster timers
 */

// ── DEV MODE toggle ──────────────────────────────────────
let devMode = false;

export function setDevMode(enabled) {
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

// ── Escalation Engine Class ──────────────────────────────
export class EscalationEngine {
  constructor() {
    this.timers = {};        // tracked timers
    this.doseLog = [];       // all dose events (in-memory)
    this.caregivers = [];    // registered caregivers
    this.onDoseLogUpdate = null; // callback for React state sync
    this.skipCounts = {};    // medicineId -> number of skips

    // Hydrate from localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('pillpulse_dose_log') || '[]');
      this.doseLog = stored;
    } catch (_e) {
      this.doseLog = [];
    }
  }

  // ── Helpers for tracking timers to expose to Dev Mode ──
  _setTimer(key, delay, name, callback) {
    this._clearTimer(key);
    const id = setTimeout(() => {
      delete this.timers[key];
      this._emitTimerUpdate();
      callback();
    }, delay);
    this.timers[key] = { id, targetTime: Date.now() + delay, name };
    this._emitTimerUpdate();
  }

  _clearTimer(key) {
    if (this.timers[key]) {
      clearTimeout(this.timers[key].id);
      delete this.timers[key];
      this._emitTimerUpdate();
    }
  }

  _clearTimersForDose(medicineId, timingSlot) {
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

  // ── Schedule a dose notification at the correct time ───
  scheduleDose(medicineId, medicineName, timingSlot, caregivers) {
    const msUntil = devMode ? 0 : this.msUntilTime(timingSlot);
    if (msUntil < 0) return;

    this._setTimer(
      `${medicineId}_${timingSlot}`, 
      msUntil, 
      `Dose: ${medicineName}`, 
      () => this.fireDoseNotification(medicineId, medicineName, timingSlot, caregivers)
    );
  }

  // ── Level 0 — Fire patient notification ────────────────
  fireDoseNotification(medicineId, medicineName, timingSlot, caregivers) {
    // Fire browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(`💊 Time for ${medicineName}`, {
          body: `${timingSlot} — Tap to confirm`,
          icon: '/logo.png',
          requireInteraction: true,
          tag: `dose_${medicineId}_${timingSlot}`,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (_e) { /* ignore */ }
    }

    // Dispatch custom event for in-app toast
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

    // Start Level 1 escalation timer
    const escalationDelay = getEscalationDelay();
    this._setTimer(
      `${medicineId}_${timingSlot}_escalation`,
      escalationDelay,
      `Reminder: ${medicineName}`,
      () => this.checkAndEscalate(medicineId, medicineName, timingSlot, caregivers, 1)
    );
  }

  // ── Mark dose as taken ─────────────────────────────────
  markTaken(medicineId, medicineName, timingSlot) {
    // Cancel any escalation timer related to this dose
    this._clearTimersForDose(medicineId, timingSlot);

    // Log as taken
    this.skipCounts[medicineId] = 0;
    this.logDose({
      medicineId,
      medicineName,
      timingSlot,
      status: 'taken',
      timestamp: new Date().toISOString()
    });

    // Confirmation notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('✅ Dose Confirmed', {
          body: `${medicineName} marked as taken. Great job!`,
          icon: '/logo.png',
          tag: `confirm_${medicineId}`,
        });
      } catch (_e) { /* ignore */ }
    }
  }

  // ── Snooze dose ────────────────────────────────────────
  snooze(medicineId, medicineName, timingSlot, caregivers) {
    // Cancel current escalation timers
    this._clearTimersForDose(medicineId, timingSlot);

    // Log snooze event
    this.logDose({
      medicineId,
      medicineName,
      timingSlot,
      status: 'snoozed',
      timestamp: new Date().toISOString()
    });

    // Re-fire notification after delay
    const snoozeDelay = getEscalationDelay();
    this._setTimer(
      `${medicineId}_${timingSlot}_snooze`,
      snoozeDelay,
      `Snoozed: ${medicineName}`,
      () => this.fireDoseNotification(medicineId, medicineName, timingSlot, caregivers)
    );

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('⏰ Snoozed', {
          body: `Reminder for ${medicineName} in ${devMode ? '5 seconds' : '15 minutes'}`,
          icon: '/logo.png',
          tag: `snooze_${medicineId}`,
        });
      } catch (_e) { /* ignore */ }
    }
  }

  // ── Mark dose as skipped → logic tracking ─────────────
  markSkipped(medicineId, medicineName, timingSlot, caregivers) {
    // Cancel any existing escalation timers
    this._clearTimersForDose(medicineId, timingSlot);

    // Determine current skip limit based on dev mode
    const SKIP_LIMIT = devMode ? 2 : 3;

    // Increment skip count
    if (!this.skipCounts[medicineId]) {
      this.skipCounts[medicineId] = 0;
    }
    this.skipCounts[medicineId]++;

    const skipCount = this.skipCounts[medicineId];

    // Log the skip
    this.logDose({
      medicineId,
      medicineName,
      timingSlot,
      status: 'skipped',
      skipCount,
      timestamp: new Date().toISOString()
    });

    if (skipCount < SKIP_LIMIT) {
      // Show how many skips remaining before caregiver is notified
      const remaining = SKIP_LIMIT - skipCount;
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`⚠️ Dose Skipped`, {
            body: `${medicineName} skipped. Skip ${remaining} more time(s) and your caregiver will be notified.`,
            icon: '/logo.png',
            tag: `skip_${medicineId}`
          });
        } catch (_e) { /* ignore */ }
      }

      // Still schedule next reminder
      const delay = getEscalationDelay();
      this._setTimer(
        `${medicineId}_${timingSlot}_skip_remind`,
        delay,
        `Retrying skip: ${medicineName}`,
        () => this.fireDoseNotification(medicineId, medicineName, timingSlot, caregivers)
      );

    } else {
      // SKIP LIMIT REACHED — escalate to caregiver immediately
      if (!caregivers || caregivers.length === 0) {
        if ('Notification' in window && Notification.permission === 'granted') {
           try {
             new Notification(`⚠️ Escalation Failed`, {
               body: `Add a caregiver to enable escalation. Skipped ${medicineName} ${skipCount} times.`,
               icon: '/logo.png'
             });
           } catch (_e) {}
        }
      } else {
        this.escalateToCaregivers(medicineId, medicineName, timingSlot, caregivers, skipCount);
      }
      
      // Reset skip count after escalation
      this.skipCounts[medicineId] = 0;
    }
  }

  escalateToCaregivers(medicineId, medicineName, timingSlot, caregivers, skipCount) {
    // 1. Show notification to patient confirming escalation
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('📢 Caregiver Notified', {
          body: `You've skipped ${medicineName} ${skipCount} times. Your caregiver has been alerted.`,
          icon: '/logo.png',
          requireInteraction: true
        });
      } catch (_e) { /* ignore */ }
    }

    // 2. Notify each registered caregiver
    if (!caregivers || caregivers.length === 0) {
      console.warn('No caregivers registered for escalation');
      return;
    }

    caregivers.forEach(caregiver => {
      const patientCode = localStorage.getItem('pillpulse_patient_code') || '';
      // Send FCM notification to caregiver's device
      fetch('http://localhost:5000/api/notify-caregiver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientCode,
          medicineName,
          timingSlot,
          skipCount
        })
      })
      .then(res => res.json())
      .then(data => console.log('Caregiver notified:', data))
      .catch(err => console.error('Failed to notify caregiver:', err));
    });

    // 3. Log escalation event
    this.logDose({
      medicineId,
      medicineName,
      timingSlot,
      status: 'escalated',
      skipCount,
      escalatedTo: caregivers.map(c => c.name),
      timestamp: new Date().toISOString()
    });
  }

  // ── Escalation logic ──────────────────────────────────
  checkAndEscalate(medicineId, medicineName, timingSlot, caregivers, level) {
    // Check if dose was already marked taken
    const todayDate = new Date().toISOString().split('T')[0];
    const alreadyTaken = this.doseLog.find(
      d => d.medicineId === medicineId &&
           d.timingSlot === timingSlot &&
           d.status === 'taken' &&
           d.timestamp.startsWith(todayDate)
    );
    if (alreadyTaken) return; // abort escalation

    if (level === 1) {
      // ── Level 1: Second reminder to patient ──
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`⚠️ Reminder: ${medicineName}`, {
            body: `You haven't confirmed your ${medicineName} dose. Please take your medicine now.`,
            icon: '/logo.png',
            requireInteraction: true,
            tag: `reminder_${medicineId}_${timingSlot}`,
          });
        } catch (_e) { /* ignore */ }
      }

      // Dispatch in-app event
      window.dispatchEvent(new CustomEvent('pillpulse-dose-alert', {
        detail: {
          type: 'reminder',
          level: 1,
          medicineId,
          medicineName,
          timingSlot,
          caregivers,
          message: `Reminder: You haven't confirmed your ${medicineName} dose`,
          actions: ['taken', 'skip']
        }
      }));

      // Wait then escalate to Level 2
      const escalationDelay = getEscalationDelay();
      this._setTimer(
        `${medicineId}_${timingSlot}_escalation_l2`,
        escalationDelay,
        `Caregiver Alert: ${medicineName}`,
        () => this.checkAndEscalate(medicineId, medicineName, timingSlot, caregivers, 2)
      );

    } else if (level === 2) {
      // ── Level 2: Notify all caregivers ──
      if (caregivers && caregivers.length > 0) {
        caregivers.forEach(caregiver => {
          this.notifyCaregiver(caregiver, medicineName, timingSlot);
        });
      }

      // ── Level 3: Log as missed dose ──
      this.logDose({
        medicineId,
        medicineName,
        timingSlot,
        status: 'missed',
        escalatedTo: caregivers ? caregivers.map(c => c.name) : [],
        timestamp: new Date().toISOString()
      });

      // Dispatch in-app missed dose event
      window.dispatchEvent(new CustomEvent('pillpulse-dose-alert', {
        detail: {
          type: 'missed',
          level: 2,
          medicineId,
          medicineName,
          timingSlot,
          caregivers,
          message: `${medicineName} dose marked as MISSED. Caregivers notified.`,
          actions: []
        }
      }));
    }
  }

  // ── Notify a single caregiver (via backend) ────────────
  notifyCaregiver(caregiver, medicineName, timingSlot) {
    const patientCode = localStorage.getItem('pillpulse_patient_code') || '';

    fetch('http://localhost:5000/api/notify-caregiver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientCode,
        medicineName,
        timingSlot
      })
    }).catch(err => {
      console.error('[EscalationEngine] Failed to notify caregiver:', err);
    });
  }

  // ── Dose log persistence ───────────────────────────────
  logDose(entry) {
    this.doseLog.push(entry);

    // Persist to localStorage
    try {
      localStorage.setItem('pillpulse_dose_log', JSON.stringify(this.doseLog));
    } catch (_e) { /* quota exceeded — ignore */ }

    // Sync with backend
    const patientCode = localStorage.getItem('pillpulse_patient_code') || '';
    if (patientCode) {
      fetch('http://localhost:5000/api/log-dose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientCode,
          medicineName: entry.medicineName,
          timingSlot: entry.timingSlot,
          status: entry.status,
          timestamp: entry.timestamp
        })
      }).catch(err => console.error('[EscalationEngine] Failed to log dose:', err));
    }

    // Notify React listeners
    if (this.onDoseLogUpdate) {
      this.onDoseLogUpdate([...this.doseLog]);
    }

    // Dispatch event for any listeners
    window.dispatchEvent(new CustomEvent('pillpulse-dose-log-updated', {
      detail: { log: [...this.doseLog] }
    }));
  }

  // ── Get the full dose log ──────────────────────────────
  getDoseLog() {
    return [...this.doseLog];
  }

  // ── Clear dose log ─────────────────────────────────────
  clearDoseLog() {
    this.doseLog = [];
    localStorage.removeItem('pillpulse_dose_log');
    if (this.onDoseLogUpdate) {
      this.onDoseLogUpdate([]);
    }
  }

  // ── Cancel all timers ──────────────────────────────────
  cancelAll() {
    Object.keys(this.timers).forEach(k => this._clearTimer(k));
    this.timers = {};
    this._emitTimerUpdate();
  }

  // ── Parse time string and compute ms until that time ───
  msUntilTime(timeString) {
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

// ── Singleton instance ───────────────────────────────────
export const escalationEngine = new EscalationEngine();
