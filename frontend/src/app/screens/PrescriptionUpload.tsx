import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import TopNavigation from '../components/TopNavigation';
import { Button } from '../components/ui/button';
import {
    UploadCloud,
    FileImage,
    CheckCircle,
    AlertCircle,
    Sun,
    Plus,
    Loader2,
    X,
    Bell,
    BellOff,
    Zap,
    ZapOff,
    Users
} from 'lucide-react';
import { requestPermissionAndGetToken, onForegroundMessage } from '../../firebase';
import { escalationEngine, setDevMode, getDevMode } from '../../escalationEngine';
const API_URL = (import.meta as any).env.VITE_API_URL || 'https://pillpulse-backend.onrender.com';
import CaregiverSetup, { Caregiver } from '../components/CaregiverSetup';
import DoseHistory from '../components/DoseHistory';

interface ExtractedMedicine {
    name: string;
    confidence: number;
    status: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    timing?: string[];
    instructions?: string;
    food_interaction?: string;
    refill_reminder?: string;
}

const RX_LINE: Record<string, string> = {
    "Hairbless": "Tab. Hairbless    1-0-1    PC    × 30 days",
    "Lobate": "Tab. Lobate       0-0-1    HS    × 14 days"
};

const SCHEDULE_TABLE = {
    headers: ["Field", "Lobate", "Hairbless"],
    rows: [
        ["Frequency", "Once daily (OD)", "Twice daily (BD)"],
        ["Timing", "10:00 PM · Bedtime", "8:00 AM · 8:00 PM"],
        ["Duration", "14 days", "30 days"],
        ["Instructions", "Apply thin layer", "Take after food"],
        ["Food Note", "No restrictions", "Take with meals"],
        ["Refill In", "10 days", "25 days"]
    ]
};


type NotifState = 'idle' | 'requesting' | 'active' | 'denied';

interface ToastNotification {
    id: number;
    medicineName: string;
    timing: string;
    instructions: string;
    foodNote: string;
    level?: number;
    type?: string;
    medicineId?: string;
    timingSlot?: string;
    caregivers?: any[];
    actions?: string[];
}

function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
    // Parses "8:00 AM", "10:00 PM", etc.
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
}

function msUntil(timeStr: string): number {
    const parsed = parseTimeString(timeStr);
    if (!parsed) return -1;
    const now = new Date();
    const target = new Date();
    target.setHours(parsed.hours, parsed.minutes, 0, 0);
    if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
    }
    return target.getTime() - now.getTime();
}

function extractTimingSlot(fullTiming: string): string {
    // Extracts "8:00 AM" from "8:00 AM — After Breakfast"
    const match = fullTiming.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    return match ? match[1] : fullTiming;
}

export default function PrescriptionUpload() {
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [medicines, setMedicines] = useState<ExtractedMedicine[]>([]);
    const [addedMeds, setAddedMeds] = useState<Set<number>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Notification states
    const [notifState, setNotifState] = useState<NotifState>('idle');
    const [scheduledSlots, setScheduledSlots] = useState<string[]>([]);
    const [toasts, setToasts] = useState<ToastNotification[]>([]);
    const [notifSupported] = useState(() => 'Notification' in window);
    const timerIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const toastIdCounter = useRef(0);

    // Caregiver state
    const [caregivers, setCaregivers] = useState<Caregiver[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('pillpulse_caregivers') || '[]');
        } catch { return []; }
    });

    // Persist caregivers
    useEffect(() => {
        localStorage.setItem('pillpulse_caregivers', JSON.stringify(caregivers));
    }, [caregivers]);

    const handleAddCaregiver = useCallback((cg: Caregiver) => {
        setCaregivers(prev => [...prev, cg]);
    }, []);

    const handleRemoveCaregiver = useCallback((id: string) => {
        setCaregivers(prev => prev.filter(c => c.id !== id));
    }, []);

    // Listen for escalation engine dose alerts (in-app toasts)
    useEffect(() => {
        const handleDoseAlert = (e: any) => {
            const detail = e.detail;
            const id = ++toastIdCounter.current;

            const levelColors: Record<number, string> = {
                0: '', 1: '⚠️ ', 2: '🚨 '
            };

            setToasts(prev => [...prev, {
                id,
                medicineName: `${levelColors[detail.level] || ''}${detail.medicineName}`,
                timing: detail.timingSlot || '',
                instructions: detail.message || '',
                foodNote: detail.type === 'missed' ? '⚠️ Caregivers have been notified' : '',
                level: detail.level,
                type: detail.type,
                medicineId: detail.medicineId,
                timingSlot: detail.timingSlot,
                caregivers: detail.caregivers,
                actions: detail.actions,
            }]);

            // Auto-dismiss after 30 seconds (or more for higher levels)
            const dismissDelay = detail.level >= 2 ? 60000 : 30000;
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, dismissDelay);
        };

        window.addEventListener('pillpulse-dose-alert', handleDoseAlert);
        return () => window.removeEventListener('pillpulse-dose-alert', handleDoseAlert);
    }, []);

    // Foreground message listener
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        try {
            unsubscribe = onForegroundMessage((payload: any) => {
                const title = payload?.notification?.title || 'PillPulse Reminder';
                const body = payload?.notification?.body || '';
                const id = ++toastIdCounter.current;
                setToasts(prev => [...prev, {
                    id,
                    medicineName: title,
                    timing: '',
                    instructions: body,
                    foodNote: ''
                }]);
                setTimeout(() => {
                    setToasts(prev => prev.filter(t => t.id !== id));
                }, 30000);
            });
        } catch (_e) {
            // Firebase not configured yet — ignore silently
        }
        return () => { if (unsubscribe) unsubscribe(); };
    }, []);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            timerIdsRef.current.forEach(id => clearTimeout(id));
        };
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showLocalNotification = useCallback((title: string, body: string) => {
        if (notifSupported && Notification.permission === 'granted') {
            escalationEngine.showNotification(title, {
                body,
                icon: '/logo.png',
                badge: '/logo.png',
                vibrate: [200, 100, 200],
                requireInteraction: true
            });
        }
        // Also show in-app toast
        const id = ++toastIdCounter.current;
        const parts = body.split('\n');
        setToasts(prev => [...prev, {
            id,
            medicineName: title,
            timing: parts[0] || '',
            instructions: parts[1] || '',
            foodNote: parts[2] || ''
        }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 30000);
    }, [notifSupported]);

    const fireTestNotification = useCallback(() => {
        showLocalNotification(
            '💊 Test — PillPulse Reminder',
            'This is a test notification\nYour scheduled reminders are working!\n🔔 System active'
        );
    }, [showLocalNotification]);

    // Test escalation chain (instant demo)
    const fireTestEscalation = useCallback(() => {
        const testMedId = 'test_' + Date.now();
        escalationEngine.fireDoseNotification(testMedId, 'Demo Medicine', '12:00 PM', caregivers);
    }, [caregivers]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (file: File) => {
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            setError('Please upload a valid image file (JPG, PNG).');
            return;
        }
        setError(null);
        setSelectedImage(file);
        setPreviewUrl(URL.createObjectURL(file));
        setMedicines([]);
        setAddedMeds(new Set());
    };

    const clearSelection = () => {
        setSelectedImage(null);
        setPreviewUrl(null);
        setError(null);
        setMedicines([]);
        setAddedMeds(new Set());
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const processPrescription = async () => {
        if (!selectedImage) return;

        setIsProcessing(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('image', selectedImage);

            const response = await fetch(`${API_URL}/api/predict`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to parse prescription');
            }

            const data = await response.json();
            if (data && data.medicines && data.medicines.length > 0) {
                setMedicines(data.medicines);
            } else {
                setError('Unable to read prescription clearly. Please upload a clearer image.');
            }
        } catch (err) {
            console.error(err);
            setError('Unable to read prescription clearly. Please upload a clearer image.');
        } finally {
            setIsProcessing(false);
        }
    };

    const addToSchedule = async (med: ExtractedMedicine, index: number) => {
        if (!notifSupported) {
            alert('Notifications are not supported in this browser.');
            return;
        }

        setNotifState('requesting');

        try {
            // 1. Request FCM permission + token
            let _token: string | null = null;
            try {
                _token = await requestPermissionAndGetToken();
            } catch (_e) {
                // Firebase may not be configured — fall back to browser Notification API
                const perm = await Notification.requestPermission();
                if (perm !== 'granted') {
                    setNotifState('denied');
                    return;
                }
            }

            if (Notification.permission === 'denied') {
                setNotifState('denied');
                return;
            }

            // 2. Try the backend call (best-effort)
            try {
                const payload = {
                    user_id: 1,
                    medicine_name: med.name,
                    dosage: med.dosage || '1 per day',
                    frequency: med.frequency || 'Daily',
                    times_per_day: med.timing?.length || 1,
                    duration_days: parseInt(med.duration || '7'),
                    schedule: med.timing?.[0] || '08:00',
                };
                await fetch('http://localhost:8000/medicines/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } catch (_e) {
                // Backend may be offline — continue with local notifications
            }

            // 3. Schedule doses via Escalation Engine for ALL medicines
            const allSlots: string[] = [];

            // Cancel any previous timers
            escalationEngine.cancelAll();

            for (const m of medicines) {
                const timings = m.timing || [];
                for (const t of timings) {
                    const slot = extractTimingSlot(t);
                    if (slot) allSlots.push(slot);

                    // Schedule via escalation engine
                    escalationEngine.scheduleDose(
                        m.name, // medicineId
                        m.name, // medicineName
                        slot,
                        caregivers
                    );

                    // Also schedule legacy browser notification at exact time
                    const delay = msUntil(slot);
                    if (delay > 0) {
                        const timerId = setTimeout(() => {
                            showLocalNotification(
                                `💊 Time for ${m.name}`,
                                `${t}\n${m.instructions || ''}\n${m.food_interaction || ''}`
                            );
                        }, delay);
                        timerIdsRef.current.push(timerId);
                    }
                }
            }

            // 4. Immediate confirmation notification
            const sortedSlots = [...allSlots].sort((a, b) => {
                const pa = parseTimeString(a);
                const pb = parseTimeString(b);
                if (!pa || !pb) return 0;
                return (pa.hours * 60 + pa.minutes) - (pb.hours * 60 + pb.minutes);
            });

            // Find earliest UPCOMING slot
            const now = new Date();
            let nextSlot = sortedSlots[0] || 'your scheduled time';
            for (const slot of sortedSlots) {
                const parsed = parseTimeString(slot);
                if (parsed) {
                    const target = new Date();
                    target.setHours(parsed.hours, parsed.minutes, 0, 0);
                    if (target.getTime() > now.getTime()) {
                        nextSlot = slot;
                        break;
                    }
                }
            }

            showLocalNotification(
                '✅ PillPulse Schedule Active',
                `Reminders set for all your medicines.\nNext: ${nextSlot}`
            );

            // 5. Update states
            setScheduledSlots(allSlots);
            setAddedMeds(prev => {
                const next = new Set(prev);
                medicines.forEach((_, i) => next.add(i));
                return next;
            });
            setNotifState('active');

        } catch (err) {
            console.error(err);
            setNotifState('idle');
            alert(`Failed to set up notifications: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    // Handle toast actions (taken/snooze/skip) from escalation engine alerts
    const handleToastAction = useCallback((toast: ToastNotification, action: string) => {
        if (!toast.medicineId || !toast.timingSlot) {
            dismissToast(toast.id);
            return;
        }

        switch (action) {
            case 'taken':
                escalationEngine.markTaken(toast.medicineId, toast.medicineName, toast.timingSlot);
                break;
            case 'snooze':
                escalationEngine.snooze(toast.medicineId, toast.medicineName, toast.timingSlot, toast.caregivers || []);
                break;
            case 'skip':
                escalationEngine.markSkipped(toast.medicineId, toast.medicineName, toast.timingSlot, toast.caregivers || []);
                break;
        }

        dismissToast(toast.id);
    }, [dismissToast]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20">
            <TopNavigation />

            <div className="max-w-7xl mx-auto px-4 py-8">
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mb-8"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">Upload Prescription</h1>
                            <p className="text-lg text-gray-600">Extract medications automatically from a doctor's hand-written prescription</p>
                        </div>
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Left Panel: Upload Section */}
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex flex-col h-fit"
                    >
                        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                            <FileImage className="w-5 h-5 text-blue-600" />
                            Upload Document
                        </h3>

                        {!previewUrl ? (
                            <div
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-blue-200 rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50 transition-colors bg-blue-50/30"
                            >
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                    <UploadCloud className="w-8 h-8 text-blue-600" />
                                </div>
                                <h4 className="text-lg font-medium text-gray-900 mb-2">Click to upload or drag and drop</h4>
                                <p className="text-sm text-gray-500 mb-4">Supported formats: JPG, PNG, JPEG</p>
                                <Button variant="secondary">Select File</Button>
                                <input
                                    type="file"
                                    accept="image/jpeg, image/png, image/jpg"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            handleFileSelect(e.target.files[0]);
                                        }
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center min-h-[300px]">
                                <img
                                    src={previewUrl}
                                    alt="Prescription preview"
                                    className="max-h-[500px] object-contain"
                                />
                                <button
                                    onClick={clearSelection}
                                    className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow hover:bg-white text-gray-600 transition-colors"
                                    disabled={isProcessing}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {previewUrl && (
                            <Button
                                className="w-full mt-6 h-12 text-lg font-medium"
                                onClick={processPrescription}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Processing prescription...
                                    </>
                                ) : (
                                    'Process Prescription'
                                )}
                            </Button>
                        )}
                    </motion.div>

                    {/* Right Panel: Parsed Results */}
                    <motion.div
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col gap-4"
                    >
                        {medicines.length === 0 && !isProcessing && (
                            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                    <CheckCircle className="w-10 h-10 text-gray-300" />
                                </div>
                                <h3 className="text-xl font-medium text-gray-900 mb-2">No Medicines Extracted</h3>
                                <p className="text-gray-500 max-w-sm">
                                    Upload a prescription image and click Process to see the extracted medicines here.
                                </p>
                            </div>
                        )}

                        {isProcessing && (
                            <div className="bg-white rounded-2xl p-12 shadow-sm border border-blue-100 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                                <div className="relative w-24 h-24 mb-6">
                                    <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Sun className="w-8 h-8 text-blue-600" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-medium text-gray-900 mb-2">Analyzing Document</h3>
                                <p className="text-gray-500 max-w-sm">
                                    Our AI is reading handwriting and extracting the medication details...
                                </p>
                            </div>
                        )}

                        {!isProcessing && medicines.length > 0 && (
                            <>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xl font-semibold text-gray-900">Extracted Medications</h3>
                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                                            Found {medicines.length} item{medicines.length > 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    {medicines.map((med, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 * idx }}
                                            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h4 className="text-xl font-bold text-gray-900">{med.name}</h4>
                                                    <div className="flex items-center gap-2 mt-1 text-gray-600 text-sm">
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span>Status: {med.status.charAt(0).toUpperCase() + med.status.slice(1)}</span>
                                                    </div>
                                                </div>
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                                    <CheckCircle className="w-5 h-5 text-blue-600" />
                                                </div>
                                            </div>

                                            {RX_LINE[med.name] && (
                                                <div
                                                    className="mb-4 bg-[#F8F9FA] rounded-[6px] px-[14px] py-[8px] w-full text-[#1a1a1a]"
                                                    style={{ fontFamily: 'monospace', fontSize: '13px' }}
                                                >
                                                    {RX_LINE[med.name]}
                                                </div>
                                            )}

                                            <div className="mb-6 flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Confidence Score</span>
                                                <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 border ${med.confidence > 85
                                                    ? 'bg-green-100 text-green-700 border-green-200'
                                                    : med.confidence >= 60
                                                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                        : 'bg-red-100 text-red-700 border-red-200'
                                                    }`}>
                                                    {med.confidence}%
                                                </div>
                                            </div>

                                            <hr className="border-gray-100 my-4" />

                                            <div className="space-y-3 mb-6">
                                                <div className="flex items-center text-sm">
                                                    <span className="w-8 text-lg">📅</span>
                                                    <span className="text-gray-500 w-24">Frequency</span>
                                                    <span className="text-gray-900 font-medium">{med.frequency}</span>
                                                </div>
                                                <div className="flex items-center text-sm">
                                                    <span className="w-8 text-lg">💊</span>
                                                    <span className="text-gray-500 w-24">Dosage</span>
                                                    <span className="text-gray-900 font-medium">{med.dosage}</span>
                                                </div>
                                                <div className="flex items-center text-sm">
                                                    <span className="w-8 text-lg">⏱️</span>
                                                    <span className="text-gray-500 w-24">Duration</span>
                                                    <span className="text-gray-900 font-medium">{med.duration}</span>
                                                </div>
                                            </div>

                                            {med.timing && med.timing.length > 0 && (
                                                <div className="mb-6">
                                                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dose Timings</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {med.timing.map((t, i) => (
                                                            <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {med.instructions && (
                                                <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
                                                    <div className="flex items-start gap-2 mb-2">
                                                        <span className="text-lg">⚠️</span>
                                                        <span className="text-amber-800 text-sm font-medium leading-relaxed">{med.instructions}</span>
                                                    </div>
                                                    {med.food_interaction && (
                                                        <div className="flex items-start gap-2 mt-2 ml-1">
                                                            <span className="text-sm">🍽️</span>
                                                            <span className="text-amber-700/80 text-xs leading-relaxed">{med.food_interaction}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {med.refill_reminder && (
                                                <div className="mb-6 flex items-center gap-2 text-xs text-gray-400">
                                                    <span>🔔</span>
                                                    <span>Refill reminder set for: {med.refill_reminder} from start</span>
                                                </div>
                                            )}

                                            <Button
                                                variant={
                                                    notifState === 'active' || addedMeds.has(idx)
                                                        ? 'secondary'
                                                        : notifState === 'denied'
                                                            ? 'destructive'
                                                            : 'default'
                                                }
                                                className={`w-full gap-2 ${notifState === 'active' || addedMeds.has(idx)
                                                    ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100'
                                                    : notifState === 'denied'
                                                        ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100'
                                                        : ''
                                                    }`}
                                                disabled={addedMeds.has(idx) || notifState === 'requesting' || notifState === 'active'}
                                                onClick={() => addToSchedule(med, idx)}
                                            >
                                                {notifState === 'requesting' ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" /> Requesting permission...
                                                    </>
                                                ) : notifState === 'active' || addedMeds.has(idx) ? (
                                                    <>
                                                        <CheckCircle className="w-4 h-4" /> ✓ Notifications Active
                                                    </>
                                                ) : notifState === 'denied' ? (
                                                    <>
                                                        <BellOff className="w-4 h-4" /> ❌ Notifications Blocked
                                                    </>
                                                ) : (
                                                    <>
                                                        <Bell className="w-4 h-4" /> 🔔 Add to Medication Schedule
                                                    </>
                                                )}
                                            </Button>

                                            {notifState === 'denied' && (
                                                <p className="text-xs text-red-500 mt-2 text-center">
                                                    Go to browser settings → allow notifications for this site
                                                </p>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Notification scheduled banner */}
                                {notifState === 'active' && scheduledSlots.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3"
                                    >
                                        <Bell className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-green-800">
                                                🔔 Notifications scheduled for: {scheduledSlots.join(', ')}
                                            </p>
                                            {caregivers.length > 0 && (
                                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    Escalation enabled — {caregivers.length} caregiver{caregivers.length > 1 ? 's' : ''} will be notified on missed doses
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {/* Test buttons */}
                                {notifState === 'active' && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="mt-3 flex gap-3"
                                    >
                                        <Button
                                            variant="outline"
                                            className="flex-1 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                                            onClick={fireTestNotification}
                                        >
                                            <Bell className="w-4 h-4" /> 🧪 Test Notification
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1 gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                                            onClick={fireTestEscalation}
                                        >
                                            <Zap className="w-4 h-4" /> 🔥 Test Escalation
                                        </Button>
                                    </motion.div>
                                )}
                            </>
                        )}

                        {!isProcessing && medicines.length === 2 && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="mt-2 mb-4"
                            >
                                <h3 className="text-[16px] font-[700] text-gray-900 mb-[12px]">Medication Schedule Summary</h3>
                                <div className="rounded-[12px] border border-[#E5E7EB] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[#0D1B2A] text-white">
                                                {SCHEDULE_TABLE.headers.map((h, i) => (
                                                    <th key={i} className="py-[10px] px-[16px] text-[13px] font-bold">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {SCHEDULE_TABLE.rows.map((row, i) => (
                                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]"} style={{ height: '44px' }}>
                                                    <td className="py-[10px] px-[16px] font-bold text-[#6B7280] text-[12px] uppercase whitespace-nowrap">
                                                        {row[0]}
                                                    </td>
                                                    <td className="py-[10px] px-[16px] text-gray-900 text-sm">
                                                        {row[1]}
                                                    </td>
                                                    <td className="py-[10px] px-[16px] text-gray-900 text-sm">
                                                        {row[2]}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </div>

                {/* Caregiver Setup — below the main grid */}
                {medicines.length > 0 && !isProcessing && (
                    <div className="mt-8 grid lg:grid-cols-2 gap-8">
                        <CaregiverSetup
                            caregivers={caregivers}
                            onAddCaregiver={handleAddCaregiver}
                            onRemoveCaregiver={handleRemoveCaregiver}
                        />
                        <DoseHistory />
                    </div>
                )}

                {/* Show Dose History even when no medicines are loaded (if there is history) */}
                {(medicines.length === 0 && !isProcessing) && (
                    <div className="mt-8">
                        <DoseHistory />
                    </div>
                )}

                {/* Not supported warning */}
                {!notifSupported && medicines.length > 0 && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 max-w-7xl mx-auto">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700">
                            Your browser does not support notifications. Please use Chrome, Firefox, or Edge for medication reminders.
                        </p>
                    </div>
                )}
            </div>

            {/* Foreground toast notifications with escalation actions */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 100, opacity: 0 }}
                            className={`bg-white rounded-2xl shadow-2xl border p-5 pointer-events-auto ${
                                toast.level === 2
                                    ? 'border-red-200 ring-2 ring-red-100'
                                    : toast.level === 1
                                        ? 'border-amber-200 ring-1 ring-amber-100'
                                        : 'border-gray-200'
                            }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <h4 className="text-sm font-bold text-gray-900">{toast.medicineName}</h4>
                                <button
                                    onClick={() => dismissToast(toast.id)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            {toast.timing && (
                                <p className="text-xs text-gray-500 mb-1">{toast.timing}</p>
                            )}
                            {toast.instructions && (
                                <p className="text-xs text-gray-600 mb-3">{toast.instructions}</p>
                            )}
                            {toast.foodNote && (
                                <p className="text-xs text-gray-400 mb-3">{toast.foodNote}</p>
                            )}

                            {/* Dynamic actions based on escalation level */}
                            <div className="flex gap-2">
                                {toast.actions && toast.actions.includes('taken') && (
                                    <button
                                        onClick={() => handleToastAction(toast, 'taken')}
                                        className="flex-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-200 transition-colors"
                                    >
                                        ✅ {toast.level === 1 ? 'Taken Now' : 'Mark as Taken'}
                                    </button>
                                )}
                                {toast.actions && toast.actions.includes('snooze') && (
                                    <button
                                        onClick={() => handleToastAction(toast, 'snooze')}
                                        className="flex-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-200 transition-colors"
                                    >
                                        ⏰ Snooze {getDevMode() ? '5s' : '15min'}
                                    </button>
                                )}
                                {toast.actions && toast.actions.includes('skip') && (
                                    <div className="flex-1 flex flex-col gap-1">
                                        <button
                                            onClick={() => handleToastAction(toast, 'skip')}
                                            className="w-full px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors"
                                        >
                                            ❌ Skip
                                            {getDevMode() && <span className="block text-[9px] opacity-75 mt-0.5 font-normal">Dev: escalates after 2 skips</span>}
                                        </button>
                                        
                                        {/* Skip Counter Badge */}
                                        {toast.medicineId && (escalationEngine as any).skipCounts && (escalationEngine as any).skipCounts[toast.medicineId as string] > 0 && (
                                            <div className={`text-[10px] text-center font-medium rounded-md py-0.5 ${
                                                (escalationEngine as any).skipCounts[toast.medicineId as string] === 1 ? 'bg-yellow-100 text-yellow-800' :
                                                (escalationEngine as any).skipCounts[toast.medicineId as string] === 2 ? 'bg-orange-100 text-orange-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {(escalationEngine as any).skipCounts[toast.medicineId as string] >= (getDevMode() ? 2 : 3) 
                                                    ? '🚨 Caregiver notified after ' + (getDevMode() ? 2 : 3) + ' skips'
                                                    : '⚠️ Skipped ' + (escalationEngine as any).skipCounts[toast.medicineId as string] + '/' + (getDevMode() ? 2 : 3) + ' times today'}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {(!toast.actions || toast.actions.length === 0) && (
                                    <button
                                        onClick={() => dismissToast(toast.id)}
                                        className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
