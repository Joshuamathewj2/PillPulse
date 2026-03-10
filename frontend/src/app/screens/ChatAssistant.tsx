import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import TopNavigation from '../components/TopNavigation';
import MessageBubble from '../components/MessageBubble';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import {
  Send,
  Mic,
  Paperclip,
  Stethoscope,
  MapPin,
  Pill,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';

interface Message {
  id: number;
  type: 'user' | 'ai';
  text: string;
  structuredData?: {
    causes?: string[];
    questions?: string[];
    actions?: string[];
  };
}

export default function ChatAssistant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'ai',
      text: "Hello! I'm PillPulse AI, your personal healthcare assistant. I'm here to help you understand your symptoms and guide you to the right care. How can I assist you today?",
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickSuggestions = [
    'I have a fever',
    'Check symptoms',
    'Find doctor near me',
    'Medication reminder',
  ];

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: messages.length + 1,
      type: 'user',
      text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      let aiResponse: Message;

      // Check for specific keywords
      if (text.toLowerCase().includes('fever') || text.toLowerCase().includes('headache')) {
        aiResponse = {
          id: messages.length + 2,
          type: 'ai',
          text: "I understand you're experiencing a headache and fever. Let me help you assess this.",
          structuredData: {
            causes: [
              'Common cold or flu',
              'Viral infection',
              'Dehydration',
              'Stress or tension',
            ],
            questions: [
              'How long have you had these symptoms?',
              'What is your current temperature?',
              'Are you experiencing any other symptoms?',
            ],
            actions: [
              'Rest and stay hydrated',
              'Monitor your temperature',
              'Take over-the-counter fever reducer if needed',
              'Consult a doctor if symptoms persist for more than 3 days',
            ],
          },
        };
      } else if (text.toLowerCase().includes('chest pain') || text.toLowerCase().includes('breathing')) {
        // Trigger emergency
        setIsTyping(false);
        navigate('/emergency');
        return;
      } else {
        aiResponse = {
          id: messages.length + 2,
          type: 'ai',
          text: "I'm here to help! Could you please provide more details about your symptoms? For example:\n\n• What symptoms are you experiencing?\n• When did they start?\n• How severe are they on a scale of 1-10?",
        };
      }

      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20">
      <TopNavigation />

      <div className="max-w-5xl mx-auto px-4 py-6 h-[calc(100vh-4rem)] flex flex-col">
        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto mb-6 space-y-4 scroll-smooth">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} type={msg.type} message={msg.text}>
              {msg.structuredData && (
                <div className="mt-4 space-y-4">
                  {/* Possible Causes */}
                  {msg.structuredData.causes && (
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <AlertCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        <h4 className="font-semibold text-gray-900">Possible Causes</h4>
                      </div>
                      <ul className="space-y-2">
                        {msg.structuredData.causes.map((cause, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-blue-500 mt-0.5">•</span>
                            {cause}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Follow-up Questions */}
                  {msg.structuredData.questions && (
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                          <HelpCircle className="w-4 h-4 text-teal-600" />
                        </div>
                        <h4 className="font-semibold text-gray-900">I need to know</h4>
                      </div>
                      <ul className="space-y-2">
                        {msg.structuredData.questions.map((question, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-teal-500 mt-0.5">?</span>
                            {question}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended Actions */}
                  {msg.structuredData.actions && (
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <h4 className="font-semibold text-gray-900">Recommended Actions</h4>
                      </div>
                      <ul className="space-y-2">
                        {msg.structuredData.actions.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Quick Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => navigate('/symptom-checker')}
                    >
                      <Stethoscope className="w-4 h-4" />
                      Check Symptoms
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => navigate('/actions')}
                    >
                      <MapPin className="w-4 h-4" />
                      Find Doctor
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Pill className="w-4 h-4" />
                      Order Medicine
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 text-red-600 hover:text-red-700"
                      onClick={() => navigate('/emergency')}
                    >
                      <AlertCircle className="w-4 h-4" />
                      Emergency Help
                    </Button>
                  </div>
                </div>
              )}
            </MessageBubble>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
              <div className="bg-blue-50 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map((suggestion, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSendMessage(suggestion)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                {suggestion}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Input Panel */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
          <div className="flex items-end gap-3">
            <Button variant="ghost" size="icon" className="shrink-0">
              <Paperclip className="w-5 h-5 text-gray-500" />
            </Button>

            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(inputText);
                }
              }}
              placeholder="Describe your symptoms or ask a question..."
              className="min-h-[60px] max-h-[120px] resize-none border-0 focus-visible:ring-0 text-base"
            />

            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="icon">
                <Mic className="w-5 h-5 text-gray-500" />
              </Button>
              <Button
                size="icon"
                onClick={() => handleSendMessage(inputText)}
                disabled={!inputText.trim()}
                className="bg-gradient-to-br from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-center text-gray-500 mt-4">
          PillPulse AI provides general health information only. Always consult a healthcare professional for medical advice.
        </p>
      </div>
    </div>
  );
}
