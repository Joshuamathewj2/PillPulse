import React, { useEffect, useState, useRef } from 'react';
import { Shield, Activity, Clock, LogOut, CheckCircle, AlertCircle, RefreshCw, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface DoseLog {
    medicineName: string;
    timingSlot: string;
    status: string;
    timestamp: string;
}

export default function CaregiverDashboard() {
    const patientCode = localStorage.getItem('pillpulse_patient_code');
    const [patientName, setPatientName] = useState('Loading...');
    const [logs, setLogs] = useState<DoseLog[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const lastLogCount = useRef(0);
    
    const fetchStatus = async (silent = false) => {
        if (!patientCode) return;
        if (!silent) setIsRefreshing(true);
        try {
            const res = await fetch(`http://localhost:5000/api/patient-status?patientCode=${patientCode}`);
            const data = await res.json();
            if (data.success) {
                setPatientName(data.patientName);
                const newLogs = data.doseLog.reverse(); // latest first
                
                // Detect new alerts
                if (lastLogCount.current > 0 && newLogs.length > lastLogCount.current) {
                    const latest = newLogs[0];
                    if (['missed', 'skipped', 'escalated'].includes(latest.status)) {
                        toast.error(`🚨 ALERT: ${data.patientName} ${latest.status} ${latest.medicineName}`, {
                            description: `Time: ${latest.timingSlot}. Please check on them immediately.`,
                            duration: 10000,
                        });
                    } else if (latest.status === 'taken') {
                        toast.success(`${data.patientName} took their ${latest.medicineName}`, {
                            duration: 3000
                        });
                    }
                }
                
                setLogs(newLogs);
                lastLogCount.current = newLogs.length;
            }
        } catch (e) {
            console.error('Failed to fetch patient status');
        } finally {
            if (!silent) setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        // Poll every 10 seconds for real-time feel
        const interval = setInterval(() => fetchStatus(true), 10000); 
        return () => clearInterval(interval);
    }, [patientCode]);

    const handleSwitchRole = () => {
        localStorage.clear();
        window.location.reload();
    };

    const takenCount = logs.filter(l => l.status === 'taken').length;
    const missedCount = logs.filter(l => l.status === 'skipped' || l.status === 'missed' || l.status === 'escalated').length;
    const adherence = logs.length ? Math.round((takenCount / (takenCount + missedCount || 1)) * 100) : 100;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-gradient-to-r from-teal-600 to-emerald-700 px-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-xl sticky top-0 z-20 text-white">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10 shadow-inner">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <p className="text-teal-100 text-xs font-bold uppercase tracking-widest opacity-80">Monitoring Patient</p>
                            <h1 className="text-3xl font-black tracking-tight">{patientName}</h1>
                        </div>
                    </div>
                    <button 
                        onClick={() => fetchStatus()} 
                        disabled={isRefreshing}
                        className={`p-3 bg-white/10 rounded-xl backdrop-blur-md hover:bg-white/20 transition-all ${isRefreshing ? 'animate-spin opacity-50' : ''}`}
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/10">
                        <p className="text-teal-100 text-xs font-bold uppercase mb-2 opacity-80">Overall Adherence</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black">{adherence}%</span>
                            <span className="text-teal-200 text-xs font-medium">score</span>
                        </div>
                        <div className="w-full h-1.5 bg-teal-900/40 rounded-full mt-3 overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${adherence}%` }}
                                className={`h-full rounded-full ${adherence > 80 ? 'bg-green-400' : adherence > 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                            />
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/10 flex flex-col justify-between">
                        <p className="text-teal-100 text-xs font-bold uppercase opacity-80">Alerts Today</p>
                        <div className="flex items-center gap-2">
                             <div className={`w-3 h-3 rounded-full ${missedCount > 0 ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`} />
                             <span className="text-2xl font-black">{missedCount}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 mt-4 space-y-8">
                {/* Today's Status Table */}
                <section className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-teal-600" /> Today's Medications
                        </h2>
                        <span className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full uppercase tracking-wider">Live View</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                    <th className="px-6 py-4">Medicine</th>
                                    <th className="px-6 py-4 hidden sm:table-cell">Schedule</th>
                                    <th className="px-6 py-4 text-right">Current Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(() => {
                                    const latestStatus = new Map<string, DoseLog>();
                                    logs.forEach(log => {
                                        const key = `${log.medicineName}-${log.timingSlot}`;
                                        if (!latestStatus.has(key)) latestStatus.set(key, log);
                                    });
                                    const uniqueMeds = Array.from(latestStatus.values());

                                    if (uniqueMeds.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-12 text-center text-gray-400 italic font-medium">
                                                    Waiting for patient logs...
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return uniqueMeds.map((med, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                                            <td className="px-6 py-5">
                                                <p className="font-bold text-gray-900">{med.medicineName}</p>
                                                <p className="text-xs text-gray-400 sm:hidden mt-1">{med.timingSlot}</p>
                                            </td>
                                            <td className="px-6 py-5 hidden sm:table-cell text-sm font-medium text-gray-500">{med.timingSlot}</td>
                                            <td className="px-6 py-5 text-right">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-xl border-2 tracking-tighter shadow-sm ${
                                                    med.status === 'taken' ? 'bg-green-50 text-green-700 border-green-100' : 
                                                    med.status === 'snoozed' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                    'bg-red-50 text-red-700 border-red-100 animate-in pulse duration-1000 infinite'
                                                }`}>
                                                    {med.status === 'taken' && <CheckCircle className="w-3 h-3" />}
                                                    {['missed', 'skipped', 'escalated'].includes(med.status) && <AlertCircle className="w-3 h-3" />}
                                                    {med.status.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Recent Alerts List */}
                <section>
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                            <Bell className="w-5 h-5 text-teal-600" /> Recent Activity
                        </h2>
                    </div>
                    
                    <div className="space-y-4">
                        {logs.length === 0 ? (
                            <div className="text-center p-12 bg-white rounded-[2rem] border-2 border-dashed border-gray-100 text-gray-400 font-medium">
                                No activity detected yet.
                            </div>
                        ) : logs.slice(0, 8).map((log, idx) => (
                            <motion.div 
                                key={idx} 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`bg-white p-5 rounded-3xl shadow-sm border-2 transition-all flex items-center gap-5 ${
                                    ['missed', 'skipped', 'escalated'].includes(log.status) ? 'border-red-100 bg-red-50/10' : 'border-gray-50 hover:border-teal-50'
                                }`}
                            >
                                {log.status === 'taken' ? (
                                    <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center shrink-0 shadow-inner">
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                    </div>
                                ) : (
                                    <div className="relative w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0 shadow-inner">
                                        {['missed', 'skipped', 'escalated'].includes(log.status) && (
                                            <div className="absolute inset-0 bg-red-400 rounded-2xl animate-ping opacity-20"></div>
                                        )}
                                        <AlertCircle className="w-6 h-6 text-red-600 relative z-10" />
                                    </div>
                                )}
                                
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <h4 className="font-black text-gray-900 leading-none">{log.medicineName}</h4>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">{log.timingSlot}</p>
                                </div>
                                
                                <div className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider ${
                                    log.status === 'taken' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                                }`}>
                                    {log.status}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
                
                {/* Developer Tools */}
                <section className="pt-12 text-center pb-12 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-4 font-bold uppercase tracking-widest">Caregiver Control Center</p>
                    <button 
                        onClick={handleSwitchRole} 
                        className="px-6 py-3 bg-white border border-gray-200 text-gray-500 rounded-2xl text-xs font-bold hover:bg-gray-50 hover:text-red-500 hover:border-red-100 transition-all flex items-center gap-2 mx-auto shadow-sm"
                    >
                        <LogOut className="w-4 h-4" /> Unlink Patient & Logout
                    </button>
                    <p className="text-[10px] text-gray-300 mt-3 font-medium">Session ID: {patientCode}</p>
                </section>
            </main>
        </div>
    );
}
