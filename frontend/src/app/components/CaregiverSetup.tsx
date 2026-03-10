import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import {
    Users,
    Plus,
    X,
    Copy,
    Check,
    Phone,
    UserPlus,
    AlertCircle,
    Trash2,
    Share2,
    MessageCircle
} from 'lucide-react';

export interface Caregiver {
    id: string;
    name: string;
    relation: string;
    method: 'fcm' | 'telegram';
    fcmToken?: string;
    telegramId?: string;
}

interface CaregiverSetupProps {
    caregivers: Caregiver[];
    onAddCaregiver: (caregiver: Caregiver) => void;
    onRemoveCaregiver: (id: string) => void;
}

const RELATION_OPTIONS = ['Son', 'Daughter', 'Spouse', 'Parent', 'Sibling', 'Doctor', 'Other'];

export default function CaregiverSetup({ caregivers, onAddCaregiver, onRemoveCaregiver }: CaregiverSetupProps) {
    const [name, setName] = useState('');
    const [relation, setRelation] = useState('Son');
    const [method, setMethod] = useState<'fcm' | 'telegram'>('fcm');
    const [telegramId, setTelegramId] = useState('');
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showTelegramInput, setShowTelegramInput] = useState(false);
    const [pendingCaregiver, setPendingCaregiver] = useState<Caregiver | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    const patientCode = localStorage.getItem('pillpulse_patient_code') || 'XXXX-0000';

    const generateCaregiverLink = () => {
        return `${window.location.origin}?caregiver=true&patient=${patientCode}`;
    };

    const handleAdd = () => {
        if (!name.trim()) {
            setError('Please enter a caregiver name');
            return;
        }
        setError('');

        const newCaregiver: Caregiver = {
            id: `cg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: name.trim(),
            relation,
            method,
        };

        if (method === 'fcm') {
            setPendingCaregiver(newCaregiver);
            setShowLinkModal(true);
        } else if (method === 'telegram') {
            setShowTelegramInput(true);
            setPendingCaregiver(newCaregiver);
        }
    };

    const confirmFCMCaregiver = () => {
        if (pendingCaregiver) {
            onAddCaregiver(pendingCaregiver);
        }
        setShowLinkModal(false);
        setPendingCaregiver(null);
        resetForm();
    };

    const confirmTelegramCaregiver = () => {
        if (!telegramId.trim()) {
            setError('Please enter a Telegram Chat ID');
            return;
        }
        if (pendingCaregiver) {
            onAddCaregiver({ ...pendingCaregiver, telegramId: telegramId.trim() });
        }
        setShowTelegramInput(false);
        setPendingCaregiver(null);
        setTelegramId('');
        resetForm();
    };

    const resetForm = () => {
        setName('');
        setRelation('Son');
        setMethod('fcm');
        setError('');
    };

    const copyLink = () => {
        navigator.clipboard.writeText(generateCaregiverLink());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getRelationIcon = (rel: string) => {
        const icons: Record<string, string> = {
            'Son': '👦', 'Daughter': '👧', 'Spouse': '💑',
            'Parent': '👨‍👩‍👧', 'Sibling': '👫', 'Doctor': '👨‍⚕️', 'Other': '👤'
        };
        return icons[rel] || '👤';
    };

    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
            id="caregiver-setup"
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Family & Caregivers</h3>
                        <p className="text-blue-100 text-sm">They will be notified if you miss a dose</p>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Patient Code Card */}
                <div className="mb-6 bg-blue-50/50 rounded-xl border border-blue-100 p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                    <p className="text-sm text-blue-800 font-semibold uppercase tracking-wider mb-2">Your Patient Code</p>
                    <div className="flex items-center justify-between gap-4">
                        <h3 className="text-3xl font-mono font-bold tracking-widest text-blue-600 select-all">
                            {localStorage.getItem('pillpulse_patient_code') || 'XXXX-0000'}
                        </h3>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={async () => {
                                await navigator.clipboard.writeText(localStorage.getItem('pillpulse_patient_code') || 'XXXX-0000');
                                alert('Code copied to clipboard!');
                            }}
                            className="shrink-0 bg-white shadow-sm border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                        </Button>
                    </div>
                    <p className="text-xs text-blue-600/70 mt-3 font-medium">Share with family to monitor your meds</p>
                </div>

                {/* Existing caregivers list */}
                {caregivers.length > 0 && (
                    <div className="mb-6 space-y-3">
                        {caregivers.map((cg, idx) => (
                            <motion.div
                                key={cg.id}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.05 * idx }}
                                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-lg">
                                        {getRelationIcon(cg.relation)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{cg.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-gray-500">{cg.relation}</span>
                                            <span className="text-gray-300">•</span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium flex items-center gap-1">
                                                {cg.method === 'fcm' ? (
                                                    <><Phone className="w-3 h-3" /> Browser</>
                                                ) : (
                                                    <><MessageCircle className="w-3 h-3" /> Telegram</>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemoveCaregiver(cg.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Remove caregiver"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Add caregiver form */}
                <div className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Caregiver Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); setError(''); }}
                            placeholder="Enter name..."
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-gray-400"
                            id="caregiver-name-input"
                        />
                    </div>

                    {/* Relation */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Relation
                        </label>
                        <select
                            value={relation}
                            onChange={(e) => setRelation(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
                            id="caregiver-relation-select"
                        >
                            {RELATION_OPTIONS.map(r => (
                                <option key={r} value={r}>{getRelationIcon(r)} {r}</option>
                            ))}
                        </select>
                    </div>

                    {/* Notify via */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Notify via
                        </label>
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value as 'fcm' | 'telegram')}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
                            id="caregiver-method-select"
                        >
                            <option value="fcm">🔔 Browser Notification (FCM)</option>
                            <option value="telegram">📱 Telegram</option>
                        </select>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Add button */}
                    <Button
                        onClick={handleAdd}
                        className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        id="add-caregiver-btn"
                    >
                        <Plus className="w-4 h-4" />
                        Add Caregiver
                    </Button>
                </div>
            </div>

            {/* ── FCM Link Modal ── */}
            <AnimatePresence>
                {showLinkModal && pendingCaregiver && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => { setShowLinkModal(false); setPendingCaregiver(null); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <Share2 className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">Share Registration Link</h3>
                                </div>
                                <button
                                    onClick={() => { setShowLinkModal(false); setPendingCaregiver(null); }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="bg-blue-50 rounded-xl p-4 mb-4">
                                <p className="text-sm text-blue-800 leading-relaxed">
                                    Ask <strong>{pendingCaregiver.name}</strong> to open PillPulse on their device
                                    and click <strong>"Register as Caregiver"</strong> to receive alerts.
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                                    Registration Link
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={generateCaregiverLink()}
                                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-600 select-all"
                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={copyLink}
                                        className="gap-1 shrink-0"
                                    >
                                        {copied ? (
                                            <><Check className="w-4 h-4 text-green-600" /> Copied!</>
                                        ) : (
                                            <><Copy className="w-4 h-4" /> Copy</>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => { setShowLinkModal(false); setPendingCaregiver(null); }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                                    onClick={confirmFCMCaregiver}
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Done — Add Caregiver
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Telegram Input Modal ── */}
            <AnimatePresence>
                {showTelegramInput && pendingCaregiver && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => { setShowTelegramInput(false); setPendingCaregiver(null); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <MessageCircle className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">Telegram Setup</h3>
                                </div>
                                <button
                                    onClick={() => { setShowTelegramInput(false); setPendingCaregiver(null); }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="bg-blue-50 rounded-xl p-4 mb-4">
                                <p className="text-sm text-blue-800 leading-relaxed">
                                    Enter <strong>{pendingCaregiver.name}'s</strong> Telegram Chat ID.
                                    They can get this by messaging <strong>@userinfobot</strong> on Telegram.
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Telegram Chat ID
                                </label>
                                <input
                                    type="text"
                                    value={telegramId}
                                    onChange={(e) => { setTelegramId(e.target.value); setError(''); }}
                                    placeholder="e.g. 123456789"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-gray-400"
                                    id="telegram-chat-id-input"
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-red-600 text-sm mb-4">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => { setShowTelegramInput(false); setPendingCaregiver(null); setTelegramId(''); }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                                    onClick={confirmTelegramCaregiver}
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Add with Telegram
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
