import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { requestPermissionAndGetToken } from '../../firebase';
import { Shield, User, Heart, CheckCircle, Copy, Share2, Loader2, AlertCircle } from 'lucide-react';
import { getDevMode } from '../../escalationEngine';

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState<'role' | 'patient-form' | 'patient-success' | 'caregiver-form' | 'caregiver-success'>('role');
    const [name, setName] = useState('');
    const [patientCode, setPatientCode] = useState(getDevMode() ? 'TEST-0000' : '');
    const [relation, setRelation] = useState('Family Member');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [patientNameMonitor, setPatientNameMonitor] = useState('');

    const generateCode = (nameStr: string) => {
        const prefix = (nameStr.replace(/[^a-zA-Z]/g, '') + 'XXXX').substring(0, 4).toUpperCase();
        const digits = Math.floor(1000 + Math.random() * 9000);
        return `${prefix}-${digits}`;
    };

    const handlePatientSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const code = getDevMode() ? 'TEST-0000' : generateCode(name);
            const token = await requestPermissionAndGetToken() || 'dummy-token';
            
            await fetch('http://localhost:5000/api/register-patient', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientCode: code, name, token })
            });

            localStorage.setItem('userRole', 'patient');
            localStorage.setItem('pillpulse_patient_code', code);
            localStorage.setItem('pillpulse_patient_name', name);
            if (token) localStorage.setItem('fcm_token', token);

            setPatientCode(code);
            setStep('patient-success');
        } catch (err) {
            setError('Failed to register patient. Backend might be down.');
        } finally {
            setLoading(false);
        }
    };

    const handleCaregiverSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const codeRegex = /^[A-Z]{4}-\d{4}$/;
        if (!getDevMode() && !codeRegex.test(patientCode)) {
            setError('Patient code must be in XXXX-0000 format.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const token = await requestPermissionAndGetToken() || 'dummy-token';
            
            const res = await fetch('http://localhost:5000/api/register-caregiver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientCode, caregiverName: name, relation, token })
            });
            const data = await res.json();
            
            if (!data.success) {
                setError(data.error || 'Failed to register. Patient code not found.');
                setLoading(false);
                return;
            }

            localStorage.setItem('userRole', 'caregiver');
            localStorage.setItem('pillpulse_patient_code', patientCode);
            localStorage.setItem('pillpulse_caregiver_name', name);
            if (token) localStorage.setItem('fcm_token', token);

            setPatientNameMonitor(data.patientName || 'Patient');
            setStep('caregiver-success');
        } catch (err) {
            setError('Failed to connect to server.');
        } finally {
            setLoading(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(patientCode);
        alert('Copied to clipboard');
    };

    const shareWhatsApp = () => {
        const msg = `Hi! Please monitor my medication on PillPulse. My Patient Code is: ${patientCode}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
                {step === 'role' && (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2">Welcome to PillPulse</h2>
                        <p className="text-gray-500 mb-8">How will you be using the app?</p>
                        <div className="space-y-4">
                            <Button onClick={() => setStep('patient-form')} className="w-full h-16 text-lg rounded-2xl bg-blue-600 hover:bg-blue-700">
                                <User className="w-6 h-6 mr-2" /> I am a Patient
                            </Button>
                            <Button onClick={() => setStep('caregiver-form')} className="w-full h-16 text-lg rounded-2xl bg-teal-600 hover:bg-teal-700">
                                <Heart className="w-6 h-6 mr-2" /> I am a Caregiver
                            </Button>
                        </div>
                    </div>
                )}
                
                {step === 'patient-form' && (
                    <div>
                        <Button variant="ghost" className="mb-4" onClick={() => setStep('role')}>&larr; Back</Button>
                        <h2 className="text-2xl font-bold mb-6">Patient Setup</h2>
                        <form onSubmit={handlePatientSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Your Name</label>
                                <input required type="text" className="w-full p-3 bg-gray-50 border rounded-xl" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" />
                            </div>
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            <Button type="submit" className="w-full h-12 bg-blue-600 rounded-xl" disabled={loading}>
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
                            </Button>
                        </form>
                    </div>
                )}

                {step === 'patient-success' && (
                    <div className="text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Setup Complete</h2>
                        <p className="text-gray-600 mb-6">Share this code with your caregiver to monitor your medication.</p>
                        
                        <div className="bg-gray-100 rounded-2xl p-6 mb-6">
                            <p className="text-sm text-gray-500 uppercase font-semibold tracking-wider mb-2">Patient Code</p>
                            <h3 className="text-4xl font-mono font-bold tracking-widest text-blue-600">{patientCode}</h3>
                        </div>

                        <div className="flex gap-3 mb-8">
                            <Button variant="outline" className="flex-1" onClick={copyCode}>
                                <Copy className="w-4 h-4 mr-2" /> Copy
                            </Button>
                            <Button variant="outline" className="flex-1 bg-[#25D366] text-white border-transparent hover:bg-[#128C7E]" onClick={shareWhatsApp}>
                                <Share2 className="w-4 h-4 mr-2" /> WhatsApp
                            </Button>
                        </div>

                        <Button onClick={onComplete} className="w-full h-12 bg-blue-600 rounded-xl text-lg">Enter App</Button>
                    </div>
                )}

                {step === 'caregiver-form' && (
                    <div>
                        <Button variant="ghost" className="mb-4" onClick={() => setStep('role')}>&larr; Back</Button>
                        <h2 className="text-2xl font-bold mb-6">Caregiver Setup</h2>
                        <form onSubmit={handleCaregiverSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Your Name</label>
                                <input required type="text" className="w-full p-3 bg-gray-50 border rounded-xl" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jane Smith" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Relation</label>
                                <select className="w-full p-3 bg-gray-50 border rounded-xl" value={relation} onChange={e => setRelation(e.target.value)}>
                                    <option>Family Member</option>
                                    <option>Nurse</option>
                                    <option>Friend</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Patient Code</label>
                                <input required type="text" className="w-full p-3 bg-gray-50 border rounded-xl uppercase font-mono tracking-widest" value={patientCode} onChange={e => setPatientCode(e.target.value.toUpperCase())} placeholder="XXXX-0000" />
                            </div>
                            {error && <p className="text-red-500 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</p>}
                            <Button type="submit" className="w-full h-12 bg-teal-600 hover:bg-teal-700 rounded-xl" disabled={loading}>
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Link to Patient'}
                            </Button>
                        </form>
                    </div>
                )}

                {step === 'caregiver-success' && (
                    <div className="text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Successfully Linked!</h2>
                        <p className="text-gray-600 mb-8">You are now monitoring medicine adherence for <strong className="text-gray-900">{patientNameMonitor}</strong>.</p>
                        <Button onClick={onComplete} className="w-full h-12 bg-teal-600 hover:bg-teal-700 rounded-xl text-lg">Go to Dashboard</Button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
