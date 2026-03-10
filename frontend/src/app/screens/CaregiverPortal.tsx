import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import {
    Bell,
    CheckCircle,
    Shield,
    Heart,
    Loader2,
    AlertCircle,
    ArrowRight
} from 'lucide-react';
import { requestPermissionAndGetToken } from '../../firebase';

export default function CaregiverPortal() {
    const [patientCode, setPatientCode] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'registering' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [patientName, setPatientName] = useState('Patient');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('patient');
        setPatientCode(code);
    }, []);

    const handleRegister = async () => {
        if (!patientCode) return;
        setStatus('registering');
        setErrorMsg('');

        try {
            // 1. Request notification permission and get FCM token
            let token: string | null = null;
            try {
                token = await requestPermissionAndGetToken();
            } catch (_e) {
                // FCM may not be configured — try basic permission
                const perm = await Notification.requestPermission();
                if (perm !== 'granted') {
                    setStatus('error');
                    setErrorMsg('Notification permission denied. Please allow notifications in browser settings.');
                    return;
                }
            }

            if (Notification.permission === 'denied') {
                setStatus('error');
                setErrorMsg('Notification permission denied. Please allow notifications in browser settings.');
                return;
            }

            // 2. POST to backend to register this caregiver
            const res = await fetch('http://localhost:5000/api/register-caregiver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientCode,
                    token: token || 'browser-only',
                    caregiverName: 'Caregiver (' + (new Date().toLocaleTimeString()) + ')',
                    relation: 'Family Member'
                })
            });
            const data = await res.json();

            if (!data.success) {
                setStatus('error');
                setErrorMsg(data.error || 'Patient code not found. Please check the link.');
                return;
            }

            // 3. Save to localStorage to persist session
            localStorage.setItem('userRole', 'caregiver');
            localStorage.setItem('pillpulse_patient_code', patientCode);
            localStorage.setItem('pillpulse_caregiver_name', 'Caregiver');
            if (token) localStorage.setItem('fcm_token', token);
            
            setPatientName(data.patientName || 'Patient');
            setStatus('success');
        } catch (err) {
            console.error('Registration error:', err);
            setStatus('error');
            setErrorMsg('Connection failed. Backend may be offline.');
        }
    };

    const goToDashboard = () => {
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20 flex items-center justify-center p-4">
            <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl shadow-lg mx-auto mb-4 overflow-hidden">
                        <img src="/logo.png" alt="PillPulse" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">PillPulse</h1>
                    <p className="text-gray-500 text-sm">Healthcare Assistant</p>
                </div>

                {/* Main card */}
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-600 to-emerald-700 px-6 py-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Caregiver Portal</h2>
                        <p className="text-teal-100 text-sm mt-1">Medicine adherence monitoring</p>
                    </div>

                    <div className="p-8">
                        {status === 'idle' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <div className="bg-teal-50 rounded-2xl p-5 mb-8 border border-teal-100">
                                    <div className="flex items-start gap-4">
                                        <Heart className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-teal-900 font-bold mb-1">
                                                Link to Patient Account
                                            </p>
                                            <p className="text-teal-800/80 text-sm leading-relaxed">
                                                You will receive real-time alerts if your patient misses a medicine dose or needs attention.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    {[
                                        'Instant missed dose alerts',
                                        'Today\'s medication status tracking',
                                        'Escalation notifications'
                                    ].map((text, i) => (
                                        <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">{text}</span>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    onClick={handleRegister}
                                    className="w-full h-14 text-lg font-bold gap-3 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 rounded-2xl shadow-lg ring-offset-2 ring-emerald-500/20 active:scale-[0.98] transition-all"
                                    id="register-caregiver-btn"
                                >
                                    <Bell className="w-6 h-6" />
                                    Connect & Monitor
                                </Button>
                            </motion.div>
                        )}

                        {status === 'registering' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="py-12 text-center"
                            >
                                <div className="relative w-24 h-24 mx-auto mb-8">
                                    <div className="absolute inset-0 border-4 border-teal-100 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-teal-600 rounded-full border-t-transparent animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="w-10 h-10 text-teal-600" />
                                    </div>
                                </div>
                                <p className="text-gray-900 text-xl font-bold">Linking accounts...</p>
                                <p className="text-gray-500 mt-2">Please allow notifications when prompted</p>
                            </motion.div>
                        )}

                        {status === 'success' && (
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="py-8 text-center"
                            >
                                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="w-10 h-10 text-green-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                    Account Linked!
                                </h3>
                                <p className="text-gray-600 mb-8 max-w-xs mx-auto">
                                    You are now monitoring medicine adherence for <strong className="text-teal-700">{patientName}</strong>.
                                </p>
                                
                                <Button
                                    onClick={goToDashboard}
                                    className="w-full h-14 text-lg font-bold gap-2 bg-gray-900 hover:bg-black rounded-2xl shadow-xl transition-all"
                                >
                                    Open Dashboard
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </motion.div>
                        )}

                        {status === 'error' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="py-8 text-center"
                            >
                                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    Connection Error
                                </h3>
                                <p className="text-gray-600 mb-8">{errorMsg}</p>
                                <Button
                                    onClick={() => setStatus('idle')}
                                    variant="outline"
                                    className="w-full h-12 rounded-xl"
                                >
                                    Try Again
                                </Button>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-400 mt-8 font-medium">
                    🛡️ PillPulse SECURE LINK — HCP-Verified
                </p>
            </motion.div>
        </div>
    );
}
