import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, 
  QrCode, 
  Camera, 
  Navigation, 
  Layers, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2
} from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to SmartMart",
    description: "Your shopping experience is about to get a whole lot smarter. Let's show you how!",
    icon: Smartphone,
    color: "bg-emerald-600"
  },
  {
    title: "Scan Your Trolley",
    description: "Start by scanning the QR code on your trolley or basket to link it to your phone.",
    icon: QrCode,
    color: "bg-blue-600"
  },
  {
    title: "Scan Products",
    description: "Use your camera to scan items. Confirm with a tap, and we'll handle the inventory!",
    icon: Camera,
    color: "bg-purple-600"
  },
  {
    title: "Smart Navigation",
    description: "Search for items and we'll guide you to the exact aisle and shelf.",
    icon: Navigation,
    color: "bg-orange-600"
  },
  {
    title: "Sync Multiple Carts",
    description: "Shopping with family? Sync multiple trolleys to generate a single combined bill.",
    icon: Layers,
    color: "bg-pink-600"
  }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const next = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setLoading(true);
      try {
        await onComplete();
      } catch (error) {
        console.error("Onboarding completion failed:", error);
        setLoading(false);
      }
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-8 max-w-md mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex flex-col items-center text-center"
        >
          <div className={`p-8 ${steps[currentStep].color} rounded-[40px] mb-8 shadow-2xl shadow-neutral-200`}>
            <StepIcon className="w-16 h-16 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-neutral-900 mb-4">
            {steps[currentStep].title}
          </h2>
          
          <p className="text-neutral-500 leading-relaxed mb-12">
            {steps[currentStep].description}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-2 mb-12">
        {steps.map((_, idx) => (
          <div 
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentStep ? 'w-8 bg-emerald-600' : 'w-2 bg-neutral-200'
            }`}
          />
        ))}
      </div>

      <div className="flex gap-4 w-full">
        {currentStep > 0 && (
          <button
            onClick={prev}
            className="flex-1 py-4 bg-neutral-100 text-neutral-600 font-bold rounded-2xl flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        )}
        <button
          onClick={next}
          disabled={loading}
          className="flex-[2] py-4 bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              {currentStep === steps.length - 1 ? <CheckCircle className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
