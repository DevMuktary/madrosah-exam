// src/app/exam/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface Question {
  id: string;
  subject: string;
  questionText: string;
  options: string[];
}

interface StudentProfile {
  id: string;
  fullName: string;
  appliedClass: "IDAADIY" | "IBTIDAAIY";
}

// Custom Modal Interface
interface AlertModal {
  isOpen: boolean;
  title: string;
  message: string;
  type: "warning" | "confirm";
  onConfirm?: () => void;
}

export default function ExamPage() {
  const router = useRouter();

  // Core App States
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Navigation States (One Question Per Screen)
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // UI, Security & Media States
  const [loading, setLoading] = useState(true);
  const [isSecureEnvReady, setIsSecureEnvReady] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [timeLeft, setTimeLeft] = useState<number>(3600);
  const [infractions, setInfractions] = useState(0);
  const [modal, setModal] = useState<AlertModal>({ isOpen: false, title: "", message: "", type: "warning" });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    async function initExam() {
      try {
        const res = await fetch("/api/exam/init");
        if (!res.ok) {
          router.push("/");
          return;
        }
        const data = await res.json();
        
        setStudent(data.student);
        setQuestions(data.questions);
        setAnswers(data.savedAnswers || {});
        
        const distinctSubjects = Array.from(
          new Set(data.questions.map((q: Question) => q.subject))
        ) as string[];
        
        setSubjects(distinctSubjects);
        if (data.timeLeft) setTimeLeft(data.timeLeft);

        setLoading(false);
      } catch (err) {
        router.push("/");
      }
    }
    initExam();
  }, [router]);

  // --- 2. PROGRESS & AUTO-ADVANCE ---
  const saveAnswerToDatabase = async (questionId: string, option: string) => {
    try {
      await fetch("/api/exam/save-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, selectedOption: option }),
      });
    } catch (err) {}
  };

  const activeQuestions = questions.filter((q) => q.subject === subjects[currentSubjectIndex]);

  const handleOptionSelect = (questionId: string, option: string) => {
    // 1. Save Answer
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    saveAnswerToDatabase(questionId, option);

    // 2. Auto Advance after 500ms (gives time to see selection highlight)
    setTimeout(() => {
      if (currentQuestionIndex < activeQuestions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else if (currentSubjectIndex < subjects.length - 1) {
        setCurrentSubjectIndex((prev) => prev + 1);
        setCurrentQuestionIndex(0);
      }
    }, 500);
  };

  // --- 3. CUSTOM ALERTS & SECURITY LOGGING ---
  const logInfraction = useCallback(async (type: string) => {
    setInfractions((prev) => prev + 1);
    try {
      await fetch("/api/exam/log-infraction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: type }),
      });
    } catch (err) {}
  }, []);

  const showAlert = (title: string, message: string, type: "warning" | "confirm" = "warning", onConfirm?: () => void) => {
    setModal({ isOpen: true, title, message, type, onConfirm });
  };

  const closeModal = () => setModal({ ...modal, isOpen: false });

  // Browser Anti-Cheat Hooks
  useEffect(() => {
    if (loading || !isSecureEnvReady) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        logInfraction("TAB_SWITCH");
        showAlert(
          "SECURITY BREACH DETECTED", 
          "You have switched tabs or minimized the browser. This infraction has been permanently logged to the Admin console.",
          "warning"
        );
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === "c") || (e.ctrlKey && e.key === "v") || e.key === "F12") {
        e.preventDefault();
        showAlert("ACTION BLOCKED", "Copy/Paste and developer tools are strictly disabled.", "warning");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, isSecureEnvReady, logInfraction]);

  // --- 4. TIMER & SUBMISSION ---
  useEffect(() => {
    if (loading || !isSecureEnvReady || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          executeSubmission();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, isSecureEnvReady, timeLeft]);

  const requestSubmission = () => {
    showAlert(
      "Submit Examination?", 
      "Are you sure you want to submit your answers? This action is irreversible and will end your session.",
      "confirm",
      executeSubmission
    );
  };

  const executeSubmission = async () => {
    setLoading(true);
    closeModal();
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    try {
      const res = await fetch("/api/exam/submit", { method: "POST" });
      if (res.ok) router.push("/");
    } catch (err) {
      showAlert("Network Error", "Failed to submit. Please check your connection and try again.", "warning");
      setLoading(false);
    }
  };

  // --- 5. SETUP GATE (Camera & Fullscreen) ---
  const initializeSecureEnvironment = async () => {
    setMediaError("");
    
    // Safari-safe Fullscreen
    const element = document.documentElement;
    if (element.requestFullscreen) {
      try { await element.requestFullscreen(); } catch (err) { console.warn("Fullscreen denied."); }
    } else if ((element as any).webkitRequestFullscreen) {
      try { await (element as any).webkitRequestFullscreen(); } catch (err) {}
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play(); // Force play for Safari
      }
      setIsSecureEnvReady(true);
    } catch (err) {
      setMediaError("Camera and Microphone access are mandatory. Please allow permissions in your browser URL bar.");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#001232] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#ffb902]/20 border-t-[#ffb902] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Mandatory Setup Screen
  if (!isSecureEnvReady) {
    return (
      <div className="min-h-screen bg-[#001232] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#000818] border border-white/10 p-8 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 bg-[#ffb902]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#ffb902]/20">
            <svg className="w-8 h-8 text-[#ffb902]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Proctoring Setup</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Live video, audio monitoring, and full-screen lockdown are required. Your feed is securely transmitted.
          </p>
          {mediaError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-sm font-medium text-red-400">{mediaError}</p>
            </div>
          )}
          <button
            onClick={initializeSecureEnvironment}
            className="w-full py-4 bg-[#ffb902] text-[#001232] font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(255,185,2,0.2)] active:scale-95 transition-all"
          >
            Allow Access & Begin
          </button>
        </div>
      </div>
    );
  }

  const activeQuestion = activeQuestions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-[#000818] text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* CUSTOM BEAUTIFUL MODAL */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#001232] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className={`text-xl font-bold mb-3 ${modal.type === 'warning' ? 'text-red-500' : 'text-white'}`}>
              {modal.title}
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-8">{modal.message}</p>
            <div className="flex gap-3">
              {modal.type === 'confirm' && (
                <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors">
                  Cancel
                </button>
              )}
              <button 
                onClick={() => { modal.onConfirm ? modal.onConfirm() : closeModal(); }}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  modal.type === 'warning' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-[#ffb902] text-[#001232] hover:bg-[#ffc833]'
                }`}
              >
                {modal.type === 'confirm' ? 'Confirm Submit' : 'I Understand'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING PROCTOR WIDGET (With Active Scanning Animation) */}
      <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 w-32 h-40 md:w-48 md:h-56 bg-[#001232] border-2 border-[#ffb902]/50 rounded-2xl overflow-hidden shadow-2xl z-50">
        <div className="absolute top-0 w-full bg-black/60 px-2 py-1 flex justify-between items-center z-10 backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-[9px] text-white font-bold tracking-widest uppercase">REC</span>
          </div>
          <span className="text-[9px] text-[#ffb902] font-mono">AI ACTIVE</span>
        </div>
        {/* Scanning Line Animation */}
        <div className="absolute top-0 left-0 w-full h-1 bg-[#ffb902]/50 shadow-[0_0_10px_#ffb902] z-10 animate-[scan_3s_ease-in-out_infinite]"></div>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover filter contrast-125 brightness-90" />
      </div>

      <style jsx>{`
        @keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
      `}</style>

      {/* HEADER */}
      <header className="bg-[#001232] border-b border-white/5 h-auto py-4 md:py-0 md:h-20 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 shrink-0 gap-4 md:gap-0 z-40">
        <div className="text-center md:text-left w-full md:w-auto">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-white">INSTITUTE OF MUTOON</h1>
          <p className="text-xs text-[#ffb902] font-bold tracking-widest uppercase mt-0.5 opacity-80">
            {student?.fullName}
          </p>
        </div>
        <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-6">
          <div className="bg-[#000818] border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
            <span className="text-[10px] md:text-xs uppercase font-bold text-gray-500">Time</span>
            <span className={`font-mono text-lg md:text-xl font-black ${timeLeft < 300 ? "text-red-500 animate-pulse" : "text-[#ffb902]"}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <button
            onClick={requestSubmission}
            className="h-10 md:h-12 px-6 bg-[#ffb902] text-[#001232] font-bold text-xs md:text-sm uppercase tracking-wider rounded-xl hover:bg-[#ffc833] transition-all"
          >
            Submit
          </button>
        </div>
      </header>

      {/* MOBILE-FIT SUBJECT NAVIGATION */}
      <nav className="w-full bg-[#001232]/50 border-b border-white/5 p-3 flex overflow-x-auto gap-2 no-scrollbar shrink-0">
        {subjects.map((sub, index) => {
          const isCompleted = questions.filter(q => q.subject === sub).every(q => answers[q.id]);
          return (
            <button
              key={sub}
              onClick={() => {
                setCurrentSubjectIndex(index);
                setCurrentQuestionIndex(0); // Reset to Q1 when switching subjects
              }}
              className={`whitespace-nowrap px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 border ${
                currentSubjectIndex === index
                  ? "bg-white/10 text-[#ffb902] border-[#ffb902]/30"
                  : "bg-transparent text-gray-400 border-transparent hover:bg-white/5"
              }`}
            >
              {sub}
              {isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-[#ffb902]"></span>}
            </button>
          );
        })}
      </nav>

      {/* ONE-QUESTION-PER-SCREEN WORKSPACE */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 flex flex-col items-center pb-40">
        <div className="w-full max-w-3xl">
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-black text-white">{subjects[currentSubjectIndex]}</h2>
            <span className="text-xs font-bold text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
              Question {currentQuestionIndex + 1} of {activeQuestions.length}
            </span>
          </div>

          {activeQuestion && (
            <div className="bg-[#001232] border border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl relative">
              <div className="flex flex-col gap-6" dir="rtl">
                
                {/* Question Text */}
                <p className="text-xl md:text-2xl font-bold text-white leading-relaxed">
                  {activeQuestion.questionText}
                </p>

                {/* Options Grid */}
                <div className="flex flex-col gap-3 mt-4">
                  {activeQuestion.options.map((option, oIndex) => {
                    const isSelected = answers[activeQuestion.id] === option;
                    const labelPrefix = ["أ", "ب", "ت", "ث"][oIndex] || `${oIndex + 1}`;
                    
                    return (
                      <button
                         key={oIndex}
                         onClick={() => handleOptionSelect(activeQuestion.id, option)}
                         className={`w-full min-h-[70px] px-5 py-4 rounded-2xl border-2 text-right transition-all duration-150 flex items-center gap-4 group ${
                           isSelected
                             ? "bg-[#ffb902]/10 border-[#ffb902] text-[#ffb902]"
                             : "bg-[#000818] border-transparent text-gray-300 hover:border-white/10 active:scale-[0.98]"
                         }`}
                      >
                         <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 transition-colors ${
                           isSelected ? "bg-[#ffb902] text-[#001232]" : "bg-white/5 text-gray-500 group-hover:text-white"
                         }`}>
                           {labelPrefix}
                         </span>
                         <span className={`text-lg md:text-xl flex-1 ${isSelected ? "font-bold" : "font-medium"}`}>
                           {option}
                         </span>
                      </button>
                    );
                  })}
                </div>

              </div>
            </div>
          )}

          {/* Bottom Navigation Controls */}
          <div className="flex justify-between items-center mt-8 px-2">
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-white/5 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.min(activeQuestions.length - 1, prev + 1))}
              disabled={currentQuestionIndex === activeQuestions.length - 1}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-white/5 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
            >
              Skip / Next
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
