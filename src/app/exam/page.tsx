// src/app/exam/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as faceDetection from '@tensorflow-models/face-detection';

interface Question { id: string; subject: string; questionText: string; options: string[]; }
interface StudentProfile { id: string; fullName: string; appliedClass: "IDAADIY" | "IBTIDAAIY"; }
interface AlertModal { isOpen: boolean; title: string; message: string; type: "warning" | "confirm"; onConfirm?: () => void; }

type ExamStage = "RULES" | "SETUP" | "EXAM" | "RESULT";

export default function ExamPage() {
  const router = useRouter();

  // Core Exam States
  const [stage, setStage] = useState<ExamStage>("RULES");
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Monitoring & Security States
  const [loading, setLoading] = useState(true);
  const [mediaError, setMediaError] = useState("");
  const [timeLeft, setTimeLeft] = useState<number>(3600);
  const [infractions, setInfractions] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);
  const [isCamSuspended, setIsCamSuspended] = useState(false);
  const [modal, setModal] = useState<AlertModal>({ isOpen: false, title: "", message: "", type: "warning" });
  const [aiStatus, setAiStatus] = useState<"LOADING" | "ACTIVE" | "ERROR">("LOADING");
  
  // Results State
  const [examResult, setExamResult] = useState<{ score: number; placement: string } | null>(null);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<faceDetection.FaceDetector | null>(null);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const peerInstance = useRef<any>(null);
  const adminVideoRef = useRef<HTMLVideoElement>(null);

  // 1. Initialize Exam Data & Monitor Page Refreshes
  useEffect(() => {
    async function initExam() {
      try {
        const res = await fetch("/api/exam/init");
        if (!res.ok) { router.push("/"); return; }
        const data = await res.json();
        
        setStudent(data.student);
        setQuestions(data.questions);
        setAnswers(data.savedAnswers || {});
        setSubjects(Array.from(new Set(data.questions.map((q: Question) => q.subject))) as string[]);
        if (data.timeLeft) setTimeLeft(data.timeLeft);

        // Handle Refresh Tracking Safely via LocalStorage
        const activeSession = localStorage.getItem("mutoon_exam_active");
        let refreshes = parseInt(localStorage.getItem("mutoon_exam_refreshes") || "0", 10);

        if (activeSession === "true") {
          refreshes += 1;
          localStorage.setItem("mutoon_exam_refreshes", refreshes.toString());
          setRefreshCount(refreshes);

          if (refreshes >= 3) {
            setLoading(false);
            handleAutoSubmitDueToRefresh();
            return;
          } else {
            showAlert(
              "REFRESH DETECTED", 
              `You refreshed the page. Warning ${refreshes}/3. Reaching 3 refreshes submits your exam automatically.`, 
              "warning"
            );
            setStage("SETUP"); // Force re-verify camera stream
          }
        }
        
        setLoading(false);
      } catch (err) { 
        router.push("/"); 
      }
    }
    initExam();
  }, [router]);

  const saveAnswerToDatabase = async (questionId: string, option: string) => {
    try {
      await fetch("/api/exam/save-answer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, selectedOption: option }),
      });
    } catch (err) {}
  };

  const activeQuestions = questions.filter((q) => q.subject === subjects[currentSubjectIndex]);

  const handleOptionSelect = (questionId: string, option: string) => {
    if (isCamSuspended) return; // Freeze inputs if camera is blocked
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    saveAnswerToDatabase(questionId, option);

    setTimeout(() => {
      if (currentQuestionIndex < activeQuestions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else if (currentSubjectIndex < subjects.length - 1) {
        setCurrentSubjectIndex((prev) => prev + 1);
        setCurrentQuestionIndex(0);
      }
    }, 500);
  };

  const logInfraction = useCallback(async (type: string) => {
    setInfractions((prev) => prev + 1);
    try {
      await fetch("/api/exam/log-infraction", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: type }),
      });
    } catch (err) {}
  }, []);

  const showAlert = useCallback((title: string, message: string, type: "warning" | "confirm" = "warning", onConfirm?: () => void) => {
    setModal({ isOpen: true, title, message, type, onConfirm });
  }, []);
  
  const closeModal = useCallback(() => setModal(prev => ({ ...prev, isOpen: false })), []);

  // 2. Window Event Focus/Lockout Observers
  useEffect(() => {
    if (stage !== "EXAM" || isCamSuspended) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        logInfraction("TAB_SWITCH");
        showAlert("SECURITY BREACH DETECTED", "You have switched tabs or minimized the browser windows.", "warning");
      }
    };
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === "c") || (e.ctrlKey && e.key === "v") || e.key === "F12") {
        e.preventDefault();
        showAlert("ACTION BLOCKED", "External copy pasting operations are disabled.", "warning");
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
  }, [stage, isCamSuspended, logInfraction, showAlert]);

  // Clean-up Streams
  const stopAllTracks = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    if (peerInstance.current) peerInstance.current.destroy();
  }, []);

  // 3. Normal Submission Handling
  const executeSubmission = useCallback(async () => {
    setLoading(true);
    closeModal();
    stopAllTracks();
    localStorage.removeItem("mutoon_exam_active");
    localStorage.removeItem("mutoon_exam_refreshes");
    
    try {
      const res = await fetch("/api/exam/submit", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setExamResult({ score: data.score, placement: data.placementClass });
        setStage("RESULT");
      } else {
        router.push("/");
      }
    } catch (err) {
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [closeModal, stopAllTracks, router]);

  // 4. Force Submission for Violation handling
  const handleAutoSubmitDueToRefresh = async () => {
    stopAllTracks();
    localStorage.removeItem("mutoon_exam_active");
    localStorage.removeItem("mutoon_exam_refreshes");
    try {
      const res = await fetch("/api/exam/submit", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setExamResult({ score: data.score, placement: data.placementClass });
        setStage("RESULT");
        showAlert("EXAM TERMINATED", "Your exam was automatically submitted because you exceeded the maximum allowed page refreshes.", "warning");
      }
    } catch (e) {
      router.push("/");
    }
  };

  // 5. Global Exam Countdown
  useEffect(() => {
    if (stage !== "EXAM" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); executeSubmission(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [stage, timeLeft, executeSubmission]);

  // 6. AI Vision Core Engine
  const loadAIModel = async () => {
    try {
      await tf.ready();
      const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
      const detectorConfig: faceDetection.MediaPipeFaceDetectorTfjsModelConfig = {
        runtime: 'tfjs', maxFaces: 2, 
      };
      detectorRef.current = await faceDetection.createDetector(model, detectorConfig);
      setAiStatus("ACTIVE");
    } catch (error) { 
      setAiStatus("ERROR"); 
    }
  };

  const startAITracking = () => {
    if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    
    trackingIntervalRef.current = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState >= 2 && detectorRef.current && aiStatus === "ACTIVE" && !isCamSuspended) {
        try {
          const faces = await detectorRef.current.estimateFaces(videoRef.current);
          
          if (faces.length === 0) {
            logInfraction("FACE_NOT_DETECTED");
            showAlert("FACE NOT DETECTED", "Please look directly into your camera frame.", "warning");
          } else if (faces.length > 1) {
            logInfraction("MULTIPLE_FACES");
            showAlert("MULTIPLE FACES DETECTED", "Multiple people detected inside the frame.", "warning");
          } else {
            const face = faces[0];
            if (face.keypoints) {
              const leftEye = face.keypoints.find(k => k.name === 'leftEye');
              const rightEye = face.keypoints.find(k => k.name === 'rightEye');
              const nose = face.keypoints.find(k => k.name === 'noseTip');
              
              if (leftEye && rightEye && nose) {
                const leftDist = Math.abs(nose.x - leftEye.x);
                const rightDist = Math.abs(nose.x - rightEye.x);
                
                if (rightDist > 0 && leftDist > 0) {
                  const ratio = leftDist / rightDist;
                  if (ratio > 1.8 || ratio < 0.55) {
                    logInfraction("LOOKED_AWAY");
                    showAlert("LOOKING AWAY DETECTED", "Ensure your head is focused toward the viewport.", "warning");
                  }
                }
              }
            }
          }
        } catch (error) {}
      }
    }, 2000); 
  };

  // 7. Media Setup & Active Hardware Failure Observation
  const initializeSecureEnvironment = async () => {
    setMediaError("");
    const element = document.documentElement;
    if (element.requestFullscreen) {
      try { await element.requestFullscreen(); } catch (err) {}
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, facingMode: "user" }, 
        audio: true 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Check for live permission changes / dynamic unplugging
      stream.getVideoTracks()[0].onended = () => {
        setIsCamSuspended(true);
        logInfraction("CAMERA_DISCONNECTED");
      };

      // Periodic sanity check loop for hardware tracks
      const hardwareTrackCheck = setInterval(() => {
        if (streamRef.current) {
          const videoTrack = streamRef.current.getVideoTracks()[0];
          if (!videoTrack || videoTrack.readyState === "ended" || !videoTrack.enabled) {
            setIsCamSuspended(true);
            clearInterval(hardwareTrackCheck);
          }
        }
      }, 3000);

      localStorage.setItem("mutoon_exam_active", "true");
      setStage("EXAM");
      
      await loadAIModel();
      setTimeout(() => startAITracking(), 1000); 

      // WebRTC Link: Receiving Admin Video Containment (Fixes muted audio bug)
      if (student?.id) {
        const { Peer } = await import('peerjs');
        const peer = new Peer(`mutoon-${student.id}`);
        
        peer.on('open', () => { peerInstance.current = peer; });
        peer.on('call', (call) => { 
          if (streamRef.current) {
            call.answer(streamRef.current);
            call.on('stream', (remoteAdminStream) => {
              if (adminVideoRef.current) {
                adminVideoRef.current.srcObject = remoteAdminStream;
                adminVideoRef.current.play().catch(() => {});
              }
            });
          } 
        });
      }
    } catch (err) {
      setMediaError("Hardware access denied. Camera and Microphone stream configuration required.");
    }
  };

  useEffect(() => {
    return () => { stopAllTracks(); };
  }, [stopAllTracks]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return <div className="min-h-screen bg-[#001232] flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#ffb902]/20 border-t-[#ffb902] rounded-full animate-spin"></div></div>;
  }

  // STAGE 0: RULES SCREEN
  if (stage === "RULES") {
    return (
      <div className="min-h-screen bg-[#000818] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-[#001232] border border-white/10 p-8 rounded-3xl shadow-2xl relative">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">EXAMINATION RULES & INSTRUCTIONS</h1>
            <p className="text-xs text-[#ffb902] font-bold tracking-widest mt-1">INSTITUTE OF MUTOON</p>
          </div>
          
          <div className="space-y-4 text-sm text-gray-300 border-y border-white/5 py-6 my-6 leading-relaxed">
            <div className="flex gap-3"><span className="text-[#ffb902] font-bold">1.</span><p>Do not switch tabs, minimize your browser, or open any inspect elements. These actions are instantly logged as security violations.</p></div>
            <div className="flex gap-3"><span className="text-[#ffb902] font-bold">2.</span><p>Ensure your face remains centered in the camera preview frame at all times. The AI tracker monitors your eye presence continuously.</p></div>
            <div className="flex gap-3"><span className="text-[#ffb902] font-bold">3.</span><p>Do not refresh the examination environment. If you reload your window <strong>3 times</strong>, your test automatically forces submission.</p></div>
            <div className="flex gap-3"><span className="text-[#ffb902] font-bold">4.</span><p>The system records and transmits live audio. Ensure you are taking this assessment in a quiet room with clear lighting profiles.</p></div>
          </div>

          <button onClick={() => setStage("SETUP")} className="w-full py-4 bg-[#ffb902] text-[#001232] font-bold rounded-xl active:scale-95 transition-all">
            I Have Read & Accept Rules
          </button>
        </div>
      </div>
    );
  }

  // STAGE 1: HARDWARE ACCESS INITIALIZATION
  if (stage === "SETUP") {
    return (
      <div className="min-h-screen bg-[#001232] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#000818] border border-white/10 p-8 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 bg-[#ffb902]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#ffb902]/20">
            <svg className="w-8 h-8 text-[#ffb902]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A11.955 11.955 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Proctoring Verification</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">Live video stream authentication required to connect with the evaluation core infrastructure.</p>
          {mediaError && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"><p className="text-sm font-medium text-red-400">{mediaError}</p></div>}
          <button onClick={initializeSecureEnvironment} className="w-full py-4 bg-[#ffb902] text-[#001232] font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(255,185,2,0.2)] active:scale-95 transition-all">Verify & Sync Camera</button>
        </div>
      </div>
    );
  }

  // STAGE 3: TEST SUMMARY & FINAL SCORES
  if (stage === "RESULT" && examResult) {
    return (
      <div className="min-h-screen bg-[#000818] text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#001232] border-2 border-[#ffb902]/30 p-8 rounded-3xl shadow-[0_0_40px_rgba(255,185,2,0.1)] text-center">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Assessment Submitted</h1>
          <p className="text-xs text-gray-400 font-medium mt-1">Your answers have been graded and logged into the records system.</p>

          <div className="my-8 p-6 bg-[#000818] rounded-2xl border border-white/5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest block">Final Attained Score</span>
              <span className="text-4xl font-black text-[#ffb902] font-mono">{examResult.score}%</span>
            </div>
            <div className="pt-4 border-t border-white/5">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest block">Assigned Placement Tier</span>
              <span className="text-xl font-bold text-white block mt-1 tracking-wide">{examResult.placement}</span>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6">
            <p className="text-xs text-blue-400 font-semibold leading-relaxed">
              ⚠️ CRITICAL ACTION REQUIRED:<br />Take a complete screenshot of this window interface right now and forward it directly to your administrative coordinator.
            </p>
          </div>

          <button onClick={() => router.push("/")} className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-xl transition-all">
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  const activeQuestion = activeQuestions[currentQuestionIndex];

  // STAGE 2: LIVE RUNNING EXAM WINDOW
  return (
    <div className="min-h-screen bg-[#000818] text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* Hidden Track Unpacker Element: Fixes the Admin incoming Audio Track mute bug */}
      <video ref={adminVideoRef} autoPlay playsInline className="hidden absolute opacity-0 pointer-events-none" />

      {/* SUSPENDED/MUTED DEVICE HARDWARE OVERLAY BLOCK */}
      {isCamSuspended && (
        <div className="fixed inset-0 z-[200] bg-[#000818]/95 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
          <div className="max-w-sm w-full bg-[#001232] border border-red-500 p-8 rounded-3xl text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <svg className="w-8 h-8 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-red-500 uppercase tracking-tight">Exam Suspended</h3>
            <p className="text-gray-300 text-xs my-4 leading-relaxed">Your video stream track was disabled or disconnected. Re-enable device hardware or check tracking connectivity to proceed. Time is still ticking.</p>
            <button onClick={() => { setIsCamSuspended(false); initializeSecureEnvironment(); }} className="w-full py-3 bg-red-500 text-white font-bold text-xs rounded-xl uppercase tracking-wider">Re-Authorize Hardware</button>
          </div>
        </div>
      )}

      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#001232] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className={`text-xl font-bold mb-3 ${modal.type === 'warning' ? 'text-red-500' : 'text-white'}`}>{modal.title}</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-8">{modal.message}</p>
            <div className="flex gap-3">
              {modal.type === 'confirm' && <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors">Cancel</button>}
              <button onClick={() => { modal.onConfirm ? modal.onConfirm() : closeModal(); }} className={`flex-1 py-3 rounded-xl font-bold transition-all ${modal.type === 'warning' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-[#ffb902] text-[#001232] hover:bg-[#ffc833]'}`}>
                {modal.type === 'confirm' ? 'Confirm Submit' : 'I Understand'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING PROCTOR VIDEO BOX CONTAINER */}
      <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 w-32 h-40 md:w-48 md:h-56 bg-[#001232] border-2 border-[#ffb902]/50 rounded-2xl overflow-hidden shadow-2xl z-50">
        <div className="absolute top-0 w-full bg-black/60 px-2 py-1 flex justify-between items-center z-10 backdrop-blur-md">
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span><span className="text-[9px] text-white font-bold tracking-widest uppercase">REC</span></div>
          <span className={`text-[9px] font-mono ${aiStatus === "ACTIVE" ? "text-[#ffb902]" : aiStatus === "LOADING" ? "text-blue-400" : "text-red-500"}`}>
            {aiStatus === "ACTIVE" ? "AI ACTIVE" : aiStatus === "LOADING" ? "LOADING..." : "AI ERROR"}
          </span>
        </div>
        <div className="absolute top-0 left-0 w-full h-1 bg-[#ffb902]/50 shadow-[0_0_10px_#ffb902] z-10 animate-[scan_3s_ease-in-out_infinite]"></div>
        <video width="320" height="240" ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover filter contrast-125 brightness-90" />
      </div>
      <style jsx>{` @keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } } `}</style>

      <header className="bg-[#001232] border-b border-white/5 h-auto py-4 md:py-0 md:h-20 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 shrink-0 gap-4 md:gap-0 z-40">
        <div className="text-center md:text-left w-full md:w-auto">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-white">INSTITUTE OF MUTOON</h1>
          <p className="text-xs text-[#ffb902] font-bold tracking-widest uppercase mt-0.5 opacity-80">{student?.fullName}</p>
        </div>
        <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-6">
          <div className="bg-[#000818] border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
            <span className="text-[10px] md:text-xs uppercase font-bold text-gray-500">Time</span>
            <span className={`font-mono text-lg md:text-xl font-black ${timeLeft < 300 ? "text-red-500 animate-pulse" : "text-[#ffb902]"}`}>{formatTime(timeLeft)}</span>
          </div>
          <button onClick={() => showAlert("Submit Examination?", "Are you sure you want to finalise and grade answers?", "confirm", executeSubmission)} className="h-10 md:h-12 px-6 bg-[#ffb902] text-[#001232] font-bold text-xs md:text-sm uppercase tracking-wider rounded-xl hover:bg-[#ffc833]">Submit</button>
        </div>
      </header>

      <nav className="w-full bg-[#001232]/50 border-b border-white/5 p-3 flex overflow-x-auto gap-2 no-scrollbar shrink-0">
        {subjects.map((sub, index) => {
          const isCompleted = questions.filter(q => q.subject === sub).every(q => answers[q.id]);
          return (
            <button key={sub} onClick={() => { setCurrentSubjectIndex(index); setCurrentQuestionIndex(0); }} className={`whitespace-nowrap px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 border ${currentSubjectIndex === index ? "bg-white/10 text-[#ffb902] border-[#ffb902]/30" : "bg-transparent text-gray-400 border-transparent hover:bg-white/5"}`}>
              {sub} {isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-[#ffb902]"></span>}
            </button>
          );
        })}
      </nav>

      <main className="flex-1 overflow-y-auto p-4 md:p-10 flex flex-col items-center pb-40">
        <div className="w-full max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-black text-white">{subjects[currentSubjectIndex]}</h2>
            <span className="text-xs font-bold text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">Question {currentQuestionIndex + 1} of {activeQuestions.length}</span>
          </div>

          {activeQuestion && (
            <div className="bg-[#001232] border border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl">
              <div className="flex flex-col gap-6" dir="rtl">
                <p className="text-xl md:text-2xl font-bold text-white leading-relaxed">{activeQuestion.questionText}</p>
                <div className="flex flex-col gap-3 mt-4">
                  {activeQuestion.options.map((option, oIndex) => {
                    const isSelected = answers[activeQuestion.id] === option;
                    const labelPrefix = ["أ", "ب", "ت", "ث"][oIndex] || `${oIndex + 1}`;
                    return (
                      <button key={oIndex} onClick={() => handleOptionSelect(activeQuestion.id, option)} disabled={isCamSuspended} className={`w-full min-h-[70px] px-5 py-4 rounded-2xl border-2 text-right flex items-center gap-4 group ${isSelected ? "bg-[#ffb902]/10 border-[#ffb902] text-[#ffb902]" : "bg-[#000818] border-transparent text-gray-300 hover:border-white/10"}`}>
                         <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${isSelected ? "bg-[#ffb902] text-[#001232]" : "bg-white/5 text-gray-500 group-hover:text-white"}`}>{labelPrefix}</span>
                         <span className={`text-lg md:text-xl flex-1 ${isSelected ? "font-bold" : "font-medium"}`}>{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-8 px-2">
            <button onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))} disabled={currentQuestionIndex === 0} className="px-6 py-3 rounded-xl font-bold text-sm bg-white/5 text-white disabled:opacity-30">Previous</button>
            <button onClick={() => setCurrentQuestionIndex(prev => Math.min(activeQuestions.length - 1, prev + 1))} disabled={currentQuestionIndex === activeQuestions.length - 1} className="px-6 py-3 rounded-xl font-bold text-sm bg-white/5 text-white disabled:opacity-30">Skip / Next</button>
          </div>
        </div>
      </main>
    </div>
  );
}
