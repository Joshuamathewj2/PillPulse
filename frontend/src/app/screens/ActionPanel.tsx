import { useNavigate } from 'react-router';
import TopNavigation from '../components/TopNavigation';
import ActionCard from '../components/ActionCard';
import {
  Calendar,
  Pill,
  MapPin,
  Lightbulb,
  FileText,
  Phone,
  Video,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import HospitalMap from '../components/HospitalMap';

export default function ActionPanel() {
  const navigate = useNavigate();
  const [isMapOpen, setIsMapOpen] = useState(false);

  const handleAction = (actionName: string) => {
    toast.success(`${actionName} action initiated`, {
      description: 'This would connect to your healthcare automation workflow',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20">
      <TopNavigation />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Healthcare Actions</h1>
          <p className="text-lg text-gray-600">
            Quick access to healthcare services and automation workflows
          </p>
        </motion.div>

        {/* Primary Actions Grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Primary Services</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ActionCard
              icon={Calendar}
              title="Book Appointment"
              description="Schedule a visit with your healthcare provider"
              buttonText="Find Doctors"
              onClick={() => handleAction('Book Appointment')}
            />
            <ActionCard
              icon={Pill}
              title="Order Medicine"
              description="Get prescriptions delivered to your door"
              buttonText="Browse Pharmacies"
              onClick={() => handleAction('Order Medicine')}
            />
            <ActionCard
              icon={MapPin}
              title="Find Hospital"
              description="Locate nearby medical facilities and clinics"
              buttonText="View Map"
              onClick={() => setIsMapOpen(true)}
            />
            <ActionCard
              icon={Lightbulb}
              title="Health Tips"
              description="Personalized wellness guidance and advice"
              buttonText="View Tips"
              onClick={() => handleAction('Health Tips')}
            />
          </div>
        </motion.div>

        {/* Telehealth Services */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Telehealth Services</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <ActionCard
              icon={Video}
              title="Video Consultation"
              description="Connect with a doctor via video call"
              buttonText="Start Call"
              onClick={() => handleAction('Video Consultation')}
            />
            <ActionCard
              icon={Phone}
              title="Call a Doctor"
              description="Speak with a healthcare professional"
              buttonText="Call Now"
              onClick={() => handleAction('Call Doctor')}
            />
            <ActionCard
              icon={Clock}
              title="24/7 Nurse Hotline"
              description="Get medical advice anytime, anywhere"
              buttonText="Connect"
              onClick={() => handleAction('Nurse Hotline')}
            />
          </div>
        </motion.div>

        {/* Document Services */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Medical Records & Reports</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-50 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Medical Records</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    View and download your complete medical history
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleAction('View Records')}
                  >
                    Access Records
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-50 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Lab Results</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Check your latest test results and reports
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleAction('View Lab Results')}
                  >
                    View Results
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Appointment Management */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Upcoming Appointments</h2>
          
          <div className="space-y-4">
            {/* Appointment 1 */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Dr. Sarah Johnson</h3>
                  <p className="text-sm text-gray-600">General Checkup</p>
                  <p className="text-sm text-gray-500 mt-1">March 15, 2026 • 10:00 AM</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Reschedule</Button>
                <Button size="sm">Join Video Call</Button>
              </div>
            </div>

            {/* Appointment 2 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Dr. Michael Chen</h3>
                  <p className="text-sm text-gray-600">Follow-up Consultation</p>
                  <p className="text-sm text-gray-500 mt-1">March 22, 2026 • 2:30 PM</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Reschedule</Button>
                <Button variant="outline" size="sm">Cancel</Button>
              </div>
            </div>
          </div>

          <Button className="w-full mt-6" variant="outline" onClick={() => handleAction('Book New Appointment')}>
            <Calendar className="w-4 h-4 mr-2" />
            Book New Appointment
          </Button>
        </motion.div>

        {/* Quick Tips Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-8 mt-8 border-2 border-teal-100"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center shrink-0">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Healthcare Tip of the Day</h3>
              <p className="text-gray-700 mb-4">
                Stay hydrated! Drinking 8 glasses of water daily helps maintain body temperature, 
                removes waste, and keeps your joints lubricated. Set reminders if needed.
              </p>
              <Button size="sm" variant="outline">Learn More</Button>
            </div>
          </div>
        </motion.div>

        {/* Back Button */}
        <div className="mt-8">
          <Button onClick={() => navigate('/')} variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Button>
        </div>
      </div>

      {isMapOpen && <HospitalMap onClose={() => setIsMapOpen(false)} />}
    </div>
  );
}
