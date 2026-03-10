import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import {
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Trash2,
    TrendingUp,
    CalendarDays,
    Pill,
    Users,
    AlertCircle
} from 'lucide-react';

interface DoseLogEntry {
    medicineId: string;
    medicineName: string;
    timingSlot: string;
    status: 'taken' | 'missed' | 'snoozed' | 'skipped' | 'escalated';
    skipCount?: number;
    escalatedTo?: string[];
    timestamp: string;
}

function getStatusBadge(entry: DoseLogEntry) {
    switch (entry.status) {
        case 'taken':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Taken
                </span>
            );
        case 'missed':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                    <XCircle className="w-3.5 h-3.5" />
                    Missed
                </span>
            );
        case 'snoozed':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                    <Clock className="w-3.5 h-3.5" />
                    Snoozed
                </span>
            );
        case 'skipped':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Skipped {entry.skipCount ? `(${entry.skipCount}×)` : ''}
                </span>
            );
        case 'escalated':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                    <AlertCircle className="w-3.5 h-3.5" />
                    🚨 Escalated
                </span>
            );
        default:
            return null;
    }
}

function formatTimestamp(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) return `Today ${timeStr}`;
    if (isYesterday) return `Yesterday ${timeStr}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
}

export default function DoseHistory() {
    const [doseLog, setDoseLog] = useState<DoseLogEntry[]>([]);
    const [filter, setFilter] = useState<'all' | 'taken' | 'missed' | 'snoozed' | 'skipped' | 'escalated'>('all');

    const loadLog = useCallback(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('pillpulse_dose_log') || '[]');
            setDoseLog(stored);
        } catch (_e) {
            setDoseLog([]);
        }
    }, []);

    useEffect(() => {
        loadLog();

        // Listen for log updates from escalation engine
        const handleUpdate = () => loadLog();
        window.addEventListener('pillpulse-dose-log-updated', handleUpdate);
        return () => window.removeEventListener('pillpulse-dose-log-updated', handleUpdate);
    }, [loadLog]);

    const clearHistory = () => {
        localStorage.removeItem('pillpulse_dose_log');
        setDoseLog([]);
    };

    // Compute adherence stats (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentLogs = doseLog.filter(d => new Date(d.timestamp) >= weekAgo);
    const takenCount = recentLogs.filter(d => d.status === 'taken').length;
    const totalDoses = recentLogs.filter(d => d.status === 'taken' || d.status === 'missed').length;
    const adherencePercent = totalDoses > 0 ? Math.round((takenCount / totalDoses) * 100) : 100;

    // Escalation summary
    const escalationsThisWeek = recentLogs.filter(d => d.status === 'escalated').length;

    const getAdherenceColor = () => {
        if (adherencePercent >= 80) return { bg: 'bg-green-500', text: 'text-green-700', bgBar: 'bg-green-100', border: 'border-green-200', label: 'Excellent' };
        if (adherencePercent >= 50) return { bg: 'bg-amber-500', text: 'text-amber-700', bgBar: 'bg-amber-100', border: 'border-amber-200', label: 'Needs Improvement' };
        return { bg: 'bg-red-500', text: 'text-red-700', bgBar: 'bg-red-100', border: 'border-red-200', label: 'Critical' };
    };

    const colors = getAdherenceColor();

    const filteredLog = doseLog
        .filter(d => filter === 'all' || d.status === filter)
        .reverse(); // newest first

    if (doseLog.length === 0) {
        return (
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center"
                id="dose-history"
            >
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                    <CalendarDays className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Dose History Yet</h3>
                <p className="text-gray-500 text-sm max-w-sm mx-auto">
                    Your dose history will appear here once you start tracking your medications.
                </p>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
            id="dose-history"
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <CalendarDays className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Dose History</h3>
                            <p className="text-emerald-100 text-sm">{doseLog.length} entries recorded</p>
                        </div>
                    </div>
                    <button
                        onClick={clearHistory}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Clear history"
                    >
                        <Trash2 className="w-4 h-4 text-white/70" />
                    </button>
                </div>
            </div>

            <div className="p-6">
                {/* Escalation Summary Banner */}
                <div className={`mb-4 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium ${
                    escalationsThisWeek > 0
                        ? 'bg-red-50 border border-red-200 text-red-700'
                        : 'bg-green-50 border border-green-200 text-green-700'
                }`}>
                    {escalationsThisWeek > 0 ? (
                        <>
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            ⚠️ {escalationsThisWeek} escalation{escalationsThisWeek > 1 ? 's' : ''} this week — caregiver was notified
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            ✅ No escalations this week
                        </>
                    )}
                </div>

                {/* Adherence Score */}
                <div className={`mb-6 p-4 rounded-xl ${colors.bgBar} border ${colors.border}`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className={`w-5 h-5 ${colors.text}`} />
                            <span className="text-sm font-semibold text-gray-800">
                                Adherence this week
                            </span>
                        </div>
                        <span className={`text-sm font-bold ${colors.text}`}>
                            {colors.label}
                        </span>
                    </div>
                    <div className="h-3 bg-white/60 rounded-full overflow-hidden mb-2">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${adherencePercent}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`h-full ${colors.bg} rounded-full`}
                        />
                    </div>
                    <p className="text-xs text-gray-600">
                        {takenCount}/{totalDoses} doses taken ({adherencePercent}%)
                    </p>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                    {(['all', 'taken', 'missed', 'skipped', 'escalated', 'snoozed'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                                filter === f
                                    ? 'bg-gray-900 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {f === 'all' ? 'All'
                                : f === 'taken' ? '✅ Taken'
                                : f === 'missed' ? '❌ Missed'
                                : f === 'skipped' ? '⚠️ Skipped'
                                : f === 'escalated' ? '🚨 Escalated'
                                : '⏰ Snoozed'}
                        </button>
                    ))}
                </div>

                {/* Dose log table */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0D1B2A] text-white">
                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">
                                    <div className="flex items-center gap-1.5">
                                        <Pill className="w-3.5 h-3.5" />
                                        Medicine
                                    </div>
                                </th>
                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">Scheduled</th>
                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">Status</th>
                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {filteredLog.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">
                                            No {filter !== 'all' ? filter : ''} entries found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLog.map((entry, idx) => (
                                        <motion.tr
                                            key={`${entry.medicineId}_${entry.timestamp}_${idx}`}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.02 * idx }}
                                            className={`${
                                                entry.status === 'escalated'
                                                    ? 'bg-red-50/40'
                                                    : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                            }`}
                                        >
                                            <td className="py-3 px-4">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {entry.medicineName}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-sm text-gray-600">{entry.timingSlot}</span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div>
                                                    {getStatusBadge(entry)}
                                                    {/* Escalated: show caregiver info */}
                                                    {entry.status === 'escalated' && entry.escalatedTo && entry.escalatedTo.length > 0 && (
                                                        <div className="flex items-center gap-1 mt-1.5">
                                                            <Users className="w-3 h-3 text-red-400" />
                                                            <span className="text-[10px] text-red-500 font-medium">
                                                                Caregiver notified after {entry.skipCount} skips: {entry.escalatedTo.join(', ')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {/* Missed: show escalated-to info */}
                                                    {entry.status === 'missed' && entry.escalatedTo && entry.escalatedTo.length > 0 && (
                                                        <div className="flex items-center gap-1 mt-1.5">
                                                            <Users className="w-3 h-3 text-gray-400" />
                                                            <span className="text-[10px] text-gray-400">
                                                                Notified: {entry.escalatedTo.join(', ')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-xs text-gray-500">
                                                    {formatTimestamp(entry.timestamp)}
                                                </span>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
}
