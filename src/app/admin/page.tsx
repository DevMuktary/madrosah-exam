// src/app/admin/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";

interface ExamLog {
  id: string;
  eventType: string;
  timestamp: string;
}

interface StudentMonitor {
  id: string;
  fullName: string;
  phone: string;
  appliedClass: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED";
  progress: number;
  finalScore: number | null;
  placementStatus: string | null;
  infractionCount: number;
  recentLogs: ExamLog[];
}

// Helper component to securely attach MediaStreams to video tags in React
const StreamPlayer = ({ stream }: { stream: MediaStream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video 
      ref={videoRef} 
      autoPlay 
      playsInline 
      muted 
      className="absolute inset-0 w-full h-full object-cover filter contrast-125 brightness-90 z-0" 
    />
  );
};

export default function AdminDashboard() {
  const [students, setStudents] = useState<StudentMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // WebRTC States
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const peerInstance = useRef<any>(null);
  const activeCalls = useRef<Set<string>>(new Set());

  // 1. Poll the database for infractions and status updates
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch("/api/admin/monitor");
        if (res.ok) {
          const data = await res.json();
          setStudents(data.students);
        }
      } catch (err) {
        console.error("Dashboard sync error");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(interval);
  }, []);

  // 2. Initialize the Admin's WebRTC Receiver
  useEffect(() => {
    let peer: any;
    const initPeer = async () => {
      const { Peer } = await import("peerjs");
      peer = new Peer("mutoon-admin"); // Dedicated Admin ID
      peerInstance.current = peer;
    };
    initPeer();

    return () => {
      if (peer) peer.destroy();
    };
  }, []);

  // 3. Connect to students when they come online
  useEffect(() => {
    if (!peerInstance.current || students.length === 0) return;

    // Generate a 1-pixel dummy stream to satisfy WebRTC's calling requirements
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const dummyStream = canvas.captureStream(1);

    students.forEach((student) => {
      if (student.status === "ACTIVE" && !activeCalls.current.has(student.id)) {
        activeCalls.current.add(student.id);

        // Call the specific student's ID
        const call = peerInstance.current.call(`mutoon-${student.id}`, dummyStream);

        if (call) {
          call.on("stream", (remoteStream: MediaStream) => {
            setStreams((prev) => ({ ...prev, [student.id]: remoteStream }));
          });

          call.on("close", () => {
            setStreams((prev) => {
              const newStreams = { ...prev };
              delete newStreams[student.id];
              return newStreams;
            });
            activeCalls.current.delete(student.id);
          });
          
          call.on("error", () => {
             activeCalls.current.delete(student.id);
          });
        }
      }
    });
  }, [students]);

  const activeCount = students.filter(s => s.status === "ACTIVE").length;
  const completedCount = students.filter(s => s.status === "COMPLETED").length;
  const criticalAlerts = students.filter(s => s.infractionCount > 0).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#001232] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#ffb902]/20 border-t-[#ffb902] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000818] text-slate-100 font-sans flex flex-col h-screen overflow-hidden">
      
      {/* COMMAND CENTER HEADER */}
      <header className="bg-[#001232] border-b border-white/10 h-20 flex items-center justify-between px-6 md:px-8 shrink-0 z-40 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#ffb902]/10 rounded-xl flex items-center justify-center border border-[#ffb902]/30 shadow-[0_0_15px_rgba(255,185,2,0.2)]">
            <svg className="w-5 h-5 text-[#ffb902]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase">Mutoon Overwatch</h1>
            <p className="text-[10px] text-[#ffb902] font-bold tracking-widest uppercase mt-0.5">Live Proctoring Dashboard</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="bg-[#000818] border border-white/5 px-5 py-2 rounded-xl flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Active Sessions</span>
            <span className="text-lg font-black text-blue-400">{activeCount}</span>
          </div>
          <div className="bg-[#000818] border border-white/5 px-5 py-2 rounded-xl flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Completed</span>
            <span className="text-lg font-black text-emerald-400">{completedCount}</span>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 px-5 py-2 rounded-xl flex flex-col items-center shadow-inner">
            <span className="text-[10px] uppercase font-bold text-red-400 tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Alerts
            </span>
            <span className="text-lg font-black text-red-500">{criticalAlerts}</span>
          </div>
        </div>
      </header>

      {/* 20-STUDENT LIVE GRID */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 auto-rows-max max-w-[1600px] mx-auto">
          
          {students.map((student) => {
            const isCheating = student.infractionCount > 0 && student.status === "ACTIVE";
            const isFinished = student.status === "COMPLETED";

            return (
              <div 
                key={student.id} 
                className={`relative flex flex-col bg-[#001232] rounded-2xl overflow-hidden transition-all duration-300 ${
                  isCheating 
                    ? "border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]" 
                    : isFinished 
                      ? "border border-emerald-500/30 opacity-80" 
                      : "border border-white/10 hover:border-white/30"
                }`}
              >
                
                {/* Simulated Video Stream Area */}
                <div className="relative w-full aspect-video bg-[#000818] border-b border-white/5 flex flex-col items-center justify-center overflow-hidden">
                  
                  {student.status === "PENDING" && (
                    <span className="text-xs text-gray-600 font-bold uppercase tracking-widest z-10">Offline</span>
                  )}
                  
                  {student.status === "ACTIVE" && (
                    <>
                      {streams[student.id] ? (
                        <StreamPlayer stream={streams[student.id]} />
                      ) : (
                        <div className="absolute inset-0 bg-[#001232] mix-blend-screen opacity-50 flex items-center justify-center z-0">
                          <div className="w-full h-full opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#ffb902] via-transparent to-transparent"></div>
                        </div>
                      )}
                      
                      <span className="absolute bottom-2 left-2 text-[10px] text-white font-bold uppercase tracking-widest z-10 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-md backdrop-blur-sm">
                        <span className={`w-1.5 h-1.5 rounded-full ${streams[student.id] ? "bg-red-500 animate-pulse" : "bg-[#ffb902]"}`}></span>
                        {streams[student.id] ? "LIVE" : "CONNECTING..."}
                      </span>
                    </>
                  )}
                  
                  {isFinished && (
                    <div className="flex flex-col items-center z-10">
                      <span className="text-3xl font-black text-emerald-400">{student.finalScore}%</span>
                      <span className="text-[10px] text-emerald-500/70 uppercase font-bold tracking-widest mt-1">Score Logged</span>
                    </div>
                  )}

                  {/* Anti-Cheat Alert Overlay */}
                  {isCheating && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider animate-pulse shadow-lg z-20">
                      {student.infractionCount} Flags
                    </div>
                  )}
                </div>

                {/* Student Info Card */}
                <div className="p-4 flex flex-col flex-1 bg-gradient-to-b from-transparent to-[#000818]/50 z-10">
                  <h3 className="text-sm font-bold text-white truncate" title={student.fullName}>
                    {student.fullName}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-mono text-gray-500">{student.phone}</span>
                    <span className="text-[10px] font-bold text-[#ffb902] bg-[#ffb902]/10 px-2 py-0.5 rounded border border-[#ffb902]/20 uppercase">
                      {student.appliedClass}
                    </span>
                  </div>

                  {student.status === "ACTIVE" && (
                    <div className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        <span>Progress</span>
                        <span className="text-white">{student.progress} Qs</span>
                      </div>
                      {isCheating && (
                        <div className="text-[10px] text-red-400 font-medium truncate">
                          Alert: {student.recentLogs[student.recentLogs.length - 1]?.eventType.replace("_", " ")}
                        </div>
                      )}
                    </div>
                  )}

                  {isFinished && (
                    <div className="mt-4 pt-3 border-t border-emerald-500/20">
                      <p className="text-[10px] text-center font-bold text-emerald-400 uppercase tracking-widest truncate">
                        {student.placementStatus}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
