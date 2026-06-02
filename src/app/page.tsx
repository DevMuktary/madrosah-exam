// src/app/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

// The ordered country list prioritizing your top 5
const countryList = [
  { code: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", name: "United States", flag: "🇺🇸" },
  { code: "+20", name: "Egypt", flag: "🇪🇬" },
  { code: "+233", name: "Ghana", flag: "🇬🇭" },
  // Divider (handled in UI)
  { code: "+93", name: "Afghanistan", flag: "🇦🇫" },
  { code: "+213", name: "Algeria", flag: "🇩🇿" },
  { code: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "+86", name: "China", flag: "🇨🇳" },
  { code: "+33", name: "France", flag: "🇫🇷" },
  { code: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "+91", name: "India", flag: "🇮🇳" },
  { code: "+62", name: "Indonesia", flag: "🇮🇩" },
  { code: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "+971", name: "UAE", flag: "🇦🇪" },
  // Note: You can add the rest of the countries here following the same format
];

export default function LoginPage() {
  const router = useRouter();
  
  // States
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countryList[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [examResult, setExamResult] = useState<{ score: number; placement: string } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setExamResult(null);

    // Combine country code and phone number (removing any leading zeros from the phone input)
    const formattedPhone = phoneNumber.startsWith("0") 
      ? phoneNumber.substring(1) 
      : phoneNumber;
    const fullPhoneNumber = `${selectedCountry.code}${formattedPhone}`;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhoneNumber }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/exam");
      } else if (res.status === 403) {
        setExamResult({
          score: data.score,
          placement: data.placement,
        });
      } else {
        setError(data.error || "Failed to authenticate.");
      }
    } catch (err) {
      setError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // High-end dark corporate background with subtle glowing orbs for 3D depth
    <main className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* 3D Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-900/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-emerald-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Glassmorphism Card */}
      <div className="max-w-md w-full bg-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl p-8 border border-white/20 z-10">
        
        <div className="text-center mb-8">
          <div className="inline-block p-3 rounded-xl bg-white/5 border border-white/10 mb-4 shadow-inner">
            {/* Placeholder for a logo, currently using an elegant icon structure */}
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21l9-5-9-5-9 5 9 5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">
            INSTITUTE OF MUTOON
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-light tracking-wider uppercase">
            Entrance Examination
          </p>
        </div>

        {examResult ? (
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 text-center backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white mb-2">Examination Completed</h2>
            <p className="text-slate-400 mb-6 text-sm">Your secure session has concluded.</p>
            
            <div className="bg-slate-950/50 rounded-lg p-5 border border-slate-800 shadow-inner">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Final Score</p>
              <p className="text-4xl font-bold text-white mb-6">{examResult.score}%</p>
              
              <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-5"></div>
              
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Placement Verdict</p>
              <span className="px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-sm font-medium">
                {examResult.placement}
              </span>
            </div>
            
            <button 
              onClick={() => setExamResult(null)}
              className="mt-6 text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Registered Phone Number
              </label>
              
              {/* Custom Input Group */}
              <div className="relative flex items-center">
                
                {/* Custom Dropdown Trigger */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="h-12 flex items-center justify-between gap-2 px-4 bg-slate-900/50 border border-slate-700 text-white rounded-l-lg hover:bg-slate-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 z-20"
                  >
                    <span className="text-xl">{selectedCountry.flag}</span>
                    <span className="text-sm font-medium">{selectedCountry.code}</span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Custom Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto">
                      <ul className="py-2">
                        {countryList.map((country, index) => (
                          <li key={index}>
                            {/* Add a divider after Ghana (index 4) */}
                            {index === 5 && <div className="h-px bg-slate-700 my-2 mx-4"></div>}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCountry(country);
                                setIsDropdownOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50 text-left transition-colors"
                            >
                              <span className="text-xl">{country.flag}</span>
                              <span className="text-sm text-white flex-1">{country.name}</span>
                              <span className="text-xs text-slate-400">{country.code}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Phone Number Input */}
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))} // Only allow numbers
                  placeholder="801 234 5678"
                  className="h-12 flex-1 w-full px-4 bg-slate-900/50 border border-l-0 border-slate-700 text-white rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 transition-all z-10"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg backdrop-blur-sm">
                <p className="text-sm text-red-400 text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full h-12 flex justify-center items-center text-white font-medium rounded-lg transition-all duration-300 ${
                loading 
                  ? "bg-slate-700 cursor-not-allowed" 
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg hover:shadow-blue-500/25"
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "Authenticate & Begin"
              )}
            </button>
          </form>
        )}
      </div>
      
      <p className="text-xs text-slate-500 mt-8 tracking-widest uppercase z-10">
        Quadrox Technologies Infrastructure
      </p>
    </main>
  );
}
