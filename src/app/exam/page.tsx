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

export default function ExamPage() {
  const router = useRouter();

  // Core App States
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [activeSubject, setActiveSubject] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // UI, Security & Media States
  const [loading, setLoading] = useState(true);
  const [isSecureEnvReady, setIsSecureEnvReady] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [timeLeft, setTimeLeft] = useState<number>(3600);
  const [infractions, setInfractions] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 1. Initialize Exam Data
  useEffect(() => {
    async function initExam() {
      try {
        // (This will connect to the API we build next)
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
        if (distinctSubjects.length > 0) setActiveSubject(distinctSubjects[0]);
        if (data.timeLeft) setTimeLeft(data.timeLeft);

        setLoading(false);
      } catch (err) {
        router.push("/");
      }
    }
    initExam();
  }, [router]);

  // 2. Database Sync & Infraction Logging
  const saveAnswerToDatabase = async (questionId: string, option: string) => {
    try {
      await fetch("/api/exam/save-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, selectedOption: option }),
      });
    } catch (err) {}
  };

  const handleOptionSelect = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: option };
      saveAnswerToDatabase(questionId, option);
      return updated;
    });
  };

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

  // 3. Strict Client-Side Anti-Cheating Engine (Browser Locks)
  useEffect(() => {
    if (loading || !isSecureEnvReady) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logInfraction("TAB_SWITCH");
        alert("SECURITY WARNING: Tab switching detected. The Admin has been notified.");
      }
    };

    const handleWindowBlur = () => logInfraction("LOST_FOCUS");
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === "c") || (e.ctrlKey && e.key === "v") || e.key === "F12") {
        e.preventDefault();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, isSecureEnvReady, logInfraction]);

  // 4. Server-Synced Countdown Clock
  useEffect(() => {
    if (loading || !isSecureEnvReady || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleExamSubmission();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, isSecureEnvReady, timeLeft]);

  // 5. Final Exam Submission Logic
  const handleExamSubmission = async () => {
    setLoading(true);
    // Stop the camera before leaving
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    try {
      const res = await fetch("/api/exam/submit", { method: "POST" });
      if (res.ok) router.push("/");
    } catch (err) {
      alert("Submission error. Re-attempting connection...");
      setLoading(false);
    }
  };

  // ============================================================================
  // 6. THE PROCTORING ENGINE: Camera, Mic, AI Tracking & Fullscreen
  // ============================================================================
  const initializeSecureEnvironment = async () => {
    setMediaError("");
    
    // Step A: Request Fullscreen
    const element = document.documentElement;
    if (element.requestFullscreen) {
      try {
        await element.requestFullscreen();
      } catch (err) {
        console.warn("Fullscreen request denied by browser.");
      }
    }

    // Step B: Request Camera and Microphone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, facingMode: "user" }, // Low res for bandwidth
        audio: true 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Setup AI tracking loop (Simulated hook for TensorFlow.js)
      // This loop runs every 3 seconds checking for head pose/absence
      setInterval(() => {
        // AI Logic goes here: Analyze videoRef.current frame
        // If (head_pitch > threshold || face_not_detected) {
        //    logInfraction("LOOKED_AWAY");
        // }
      }, 3000);

      setIsSecureEnvReady(true);

    } catch (err) {
      setMediaError("Camera and Microphone access are mandatory for this examination. Please allow permissions in your browser settings and try again.");
    }
  };

  // Format countdown text helper
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

  // Mandatory Setup Screen (Fullscreen + Camera + Mic)
  if (!isSecureEnvReady) {
    return (
      <div className="min-h-screen bg-[#001232] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-[#001232] border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          
          <div className="w-16 h-16 bg-[#ffb902]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#ffb902]/20">
            <svg className="w-8 h-8 text-[#ffb902]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Proctoring Setup</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            The <b>Institute of Mutoon</b> requires live video, audio monitoring, and full-screen lockdown to ensure academic integrity. Your feed is securely transmitted to the invigilator.
          </p>

          {mediaError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-sm font-medium text-red-400">{mediaError}</p>
            </div>
          )}

          <button
            onClick={initializeSecureEnvironment}
            className="w-full py-4 bg-[#ffb902] text-[#001232] font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(255,185,2,0.2)] hover:bg-[#ffc833] transition-all transform active:scale-95"
          >
            Allow Access & Begin
          </button>
        </div>
      </div>
    );
  }

  const activeQuestions = questions.filter((q) => q.subject === activeSubject);

  return (
    <div className="min-h-screen bg-[#000818] text-slate-100 flex flex-col select-none font-sans relative">
      
      {/* 
        Floating Proctoring Widget 
        Shows the student that their camera is active and recording. 
      */}
      <div className="fixed bottom-6 left-6 w-48 h-36 bg-[#001232] border border-[#ffb902]/30 rounded-2xl overflow-hidden shadow-2xl z-50 flex flex-col">
        <div className="bg-[#ffb902]/10 h-6 flex items-center px-3 gap-2 border-b border-[#ffb902]/20">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-[10px] text-[#ffb902] font-bold tracking-widest uppercase">Live Proctor</span>
        </div>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover opacity-80 filter contrast-125"
        />
      </div>

      {/* High-End Fixed Header */}
      <header className="bg-[#001232] border-b border-white/10 h-20 flex items-center justify-between px-6 md:px-10 sticky top-0 z-40 shadow-xl">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">INSTITUTE OF MUTOON</h1>
          <p className="text-xs text-[#ffb902] font-bold tracking-wider uppercase mt-1">
            {student?.fullName} • <span className="opacity-70">{student?.appliedClass}</span>
          </p>
        </div>

        <div className="flex items-center gap-6">
          {infractions > 0 && (
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Flags: {infractions}
            </div>
          )}
          
          <div className="bg-white/5 border border-white/10 px-5 py-2.5 rounded-xl flex items-center gap-4 shadow-inner">
            <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">Time</span>
            <span className={`font-mono text-xl font-black tracking-widest ${timeLeft < 300 ? "text-red-500 animate-pulse" : "text-[#ffb902]"}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <button
            onClick={() => {
              if (confirm("Are you sure you want to finalize and submit? This is irreversible.")) handleExamSubmission();
            }}
            className="h-12 px-6 bg-[#ffb902] hover:bg-[#ffc833] text-[#001232] font-black text-sm uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(255,185,2,0.3)] transition-all"
          >
            Submit
          </button>
        </div>
      </header>

      {/* Main Multi-Subject Portal Grid */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl mx-auto w-full">
        
        {/* Navigation Sidebar */}
        <nav className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-x-visible shrink-0 bg-[#001232]/50">
          <p className="hidden md:block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3 ml-2">
            Exam Sections
          </p>
          {subjects.map((sub) => {
            const isCompleted = questions.filter(q => q.subject === sub).every(q => answers[q.id]);
            return (
              <button
                key={sub}
                onClick={() => setActiveSubject(sub)}
                className={`h-14 px-5 rounded-xl font-bold text-sm text-left transition-all duration-300 flex items-center justify-between shrink-0 md:shrink border ${
                  activeSubject === sub
                    ? "bg-white/10 text-[#ffb902] border-[#ffb902]/30 shadow-lg"
                    : "bg-transparent text-gray-400 border-transparent hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{sub}</span>
                {isCompleted && (
                  <span className={`w-2 h-2 rounded-full ${activeSubject === sub ? "bg-[#ffb902]" : "bg-gray-600"}`}></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Primary Workspace */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 pb-32">
          <div className="border-b border-white/10 pb-5 mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black text-white tracking-tight">{activeSubject}</h2>
            <span className="text-xs text-[#ffb902] font-bold tracking-widest uppercase bg-[#ffb902]/10 px-4 py-2 rounded-lg border border-[#ffb902]/20">
              Answered: {questions.filter(q => q.subject === activeSubject && answers[q.id]).length} / {activeQuestions.length}
            </span>
          </div>

          {activeQuestions.map((q, qIndex) => (
            <div
              key={q.id}
              className="bg-[#001232] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl"
            >
              <div className="flex items-start gap-4" dir="rtl">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-sm font-black text-[#ffb902] shrink-0">
                  {qIndex + 1}
                </span>
                <p className="text-lg md:text-xl font-semibold text-white text-right leading-relaxed flex-1 pt-1">
                  {q.questionText}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
                {q.options.map((option, oIndex) => {
                  const isSelected = answers[q.id] === option;
                  const labelPrefix = ["أ", "ب", "ت", "ث"][oIndex] || `${oIndex + 1}`;
                  
                  return (
                    <button
                      key={oIndex}
                      onClick={() => handleOptionSelect(q.id, option)}
                      className={`min-h-[64px] px-5 py-4 rounded-xl border-2 text-right transition-all duration-200 flex items-center gap-4 group ${
                        isSelected
                          ? "bg-[#ffb902]/10 border-[#ffb902] text-[#ffb902]"
                          : "bg-white/5 border-transparent text-gray-300 hover:bg-white/10 hover:border-white/10"
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors shrink-0 ${
                        isSelected 
                          ? "bg-[#ffb902] text-[#001232]" 
                          : "bg-[#001232] border border-white/10 text-gray-500 group-hover:text-white group-hover:border-white/30"
                      }`}>
                        {labelPrefix}
                      </span>
                      <span className={`text-base font-medium flex-1 ${isSelected ? "font-bold" : ""}`}>{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
