// src/app/page.tsx
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

// Comprehensive country list prioritizing your top 5
const countryList = [
  // Priority
  { code: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", name: "United States", flag: "🇺🇸" },
  { code: "+20", name: "Egypt", flag: "🇪🇬" },
  { code: "+233", name: "Ghana", flag: "🇬🇭" },
  // Alphabetical (Comprehensive selection)
  { code: "+93", name: "Afghanistan", flag: "🇦🇫" },
  { code: "+355", name: "Albania", flag: "🇦🇱" },
  { code: "+213", name: "Algeria", flag: "🇩🇿" },
  { code: "+376", name: "Andorra", flag: "🇦🇩" },
  { code: "+244", name: "Angola", flag: "🇦🇴" },
  { code: "+54", name: "Argentina", flag: "🇦🇷" },
  { code: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "+43", name: "Austria", flag: "🇦🇹" },
  { code: "+973", name: "Bahrain", flag: "🇧🇭" },
  { code: "+880", name: "Bangladesh", flag: "🇧🇩" },
  { code: "+32", name: "Belgium", flag: "🇧🇪" },
  { code: "+229", name: "Benin", flag: "🇧🇯" },
  { code: "+55", name: "Brazil", flag: "🇧🇷" },
  { code: "+226", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "+237", name: "Cameroon", flag: "🇨🇲" },
  { code: "+1", name: "Canada", flag: "🇨🇦" },
  { code: "+236", name: "Central African Republic", flag: "🇨🇫" },
  { code: "+235", name: "Chad", flag: "🇹🇩" },
  { code: "+86", name: "China", flag: "🇨🇳" },
  { code: "+225", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "+45", name: "Denmark", flag: "🇩🇰" },
  { code: "+253", name: "Djibouti", flag: "🇩🇯" },
  { code: "+240", name: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "+251", name: "Ethiopia", flag: "🇪🇹" },
  { code: "+358", name: "Finland", flag: "🇫🇮" },
  { code: "+33", name: "France", flag: "🇫🇷" },
  { code: "+241", name: "Gabon", flag: "🇬🇦" },
  { code: "+220", name: "Gambia", flag: "🇬🇲" },
  { code: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "+224", name: "Guinea", flag: "🇬🇳" },
  { code: "+91", name: "India", flag: "🇮🇳" },
  { code: "+62", name: "Indonesia", flag: "🇮🇩" },
  { code: "+98", name: "Iran", flag: "🇮🇷" },
  { code: "+964", name: "Iraq", flag: "🇮🇶" },
  { code: "+353", name: "Ireland", flag: "🇮🇪" },
  { code: "+39", name: "Italy", flag: "🇮🇹" },
  { code: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "+962", name: "Jordan", flag: "🇯🇴" },
  { code: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "+965", name: "Kuwait", flag: "🇰🇼" },
  { code: "+961", name: "Lebanon", flag: "🇱🇧" },
  { code: "+218", name: "Libya", flag: "🇱🇾" },
  { code: "+60", name: "Malaysia", flag: "🇲🇾" },
  { code: "+223", name: "Mali", flag: "🇲🇱" },
  { code: "+222", name: "Mauritania", flag: "🇲🇷" },
  { code: "+212", name: "Morocco", flag: "🇲🇦" },
  { code: "+258", name: "Mozambique", flag: "🇲🇿" },
  { code: "+31", name: "Netherlands", flag: "🇳🇱" },
  { code: "+227", name: "Niger", flag: "🇳🇪" },
  { code: "+47", name: "Norway", flag: "🇳🇴" },
  { code: "+968", name: "Oman", flag: "🇴🇲" },
  { code: "+92", name: "Pakistan", flag: "🇵🇰" },
  { code: "+970", name: "Palestine", flag: "🇵🇸" },
  { code: "+63", name: "Philippines", flag: "🇵🇭" },
  { code: "+48", name: "Poland", flag: "🇵🇱" },
  { code: "+351", name: "Portugal", flag: "🇵🇹" },
  { code: "+974", name: "Qatar", flag: "🇶🇦" },
  { code: "+7", name: "Russia", flag: "🇷🇺" },
  { code: "+250", name: "Rwanda", flag: "🇷🇼" },
  { code: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+221", name: "Senegal", flag: "🇸🇳" },
  { code: "+232", name: "Sierra Leone", flag: "🇸🇱" },
  { code: "+65", name: "Singapore", flag: "🇸🇬" },
  { code: "+252", name: "Somalia", flag: "🇸🇴" },
  { code: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "+34", name: "Spain", flag: "🇪🇸" },
  { code: "+249", name: "Sudan", flag: "🇸🇩" },
  { code: "+46", name: "Sweden", flag: "🇸🇪" },
  { code: "+41", name: "Switzerland", flag: "🇨🇭" },
  { code: "+963", name: "Syria", flag: "🇸🇾" },
  { code: "+255", name: "Tanzania", flag: "🇹🇿" },
  { code: "+228", name: "Togo", flag: "🇹🇬" },
  { code: "+216", name: "Tunisia", flag: "🇹🇳" },
  { code: "+90", name: "Turkey", flag: "🇹🇷" },
  { code: "+256", name: "Uganda", flag: "🇺🇬" },
  { code: "+971", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+967", name: "Yemen", flag: "🇾🇪" },
  { code: "+260", name: "Zambia", flag: "🇿🇲" },
  { code: "+263", name: "Zimbabwe", flag: "🇿🇼" }
];

export default function LoginPage() {
  const router = useRouter();
  
  // Core States
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countryList[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); // For mobile filtering
  
  // Status States
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

  // Filter countries based on search query
  const filteredCountries = useMemo(() => {
    return countryList.filter(country => 
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      country.code.includes(searchQuery)
    );
  }, [searchQuery]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setExamResult(null);

    // Remove leading zero and spaces
    const formattedPhone = phoneNumber.replace(/^0+/, '').replace(/\s+/g, '');
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
    // Base Brand Color: #001232
    <main className="min-h-screen bg-[#001232] flex flex-col justify-center items-center px-4 sm:px-6 relative overflow-hidden font-sans">
      
      {/* Abstract Background Glow (using #ffb902 for ambient light) */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] bg-[#001232] shadow-[0_0_150px_rgba(255,185,2,0.1)] rounded-full blur-[100px] pointer-events-none"></div>
      
      {/* Main Glassmorphism Card */}
      <div className="w-full max-w-md bg-[#001232]/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 sm:p-10 border border-white/10 z-10">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#ffb902]/10 border border-[#ffb902]/20 mb-6">
            {/* Elegant Book/Crescent Icon matching the theme */}
            <svg className="w-8 h-8 text-[#ffb902]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            INSTITUTE OF MUTOON
          </h1>
          <p className="text-sm text-[#ffb902] mt-2 font-medium tracking-widest uppercase">
            Entrance Examination
          </p>
        </div>

        {/* Dynamic State Rendering */}
        {examResult ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 text-center animate-in fade-in duration-500">
            <h2 className="text-xl font-semibold text-white mb-2">Examination Completed</h2>
            <p className="text-gray-400 mb-8 text-sm">Your secure session has concluded.</p>
            
            <div className="bg-[#001232] rounded-xl p-6 border border-white/5 shadow-inner mb-8">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Final Score</p>
              <p className="text-5xl font-black text-[#ffb902] mb-8">{examResult.score}%</p>
              
              <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-6"></div>
              
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Placement Verdict</p>
              <span className="px-5 py-2.5 bg-[#ffb902]/10 text-[#ffb902] border border-[#ffb902]/20 rounded-full text-sm font-bold tracking-wide">
                {examResult.placement}
              </span>
            </div>
            
            <button 
              onClick={() => setExamResult(null)}
              className="w-full py-4 text-sm font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300 ml-1">
                Registered Phone Number
              </label>
              
              {/* Complex Input Group - Fixed to Always Be Side-by-Side */}
              <div className="relative flex shadow-sm rounded-xl">
                
                {/* Custom Country Dropdown Trigger */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-[110px] sm:w-[130px] h-[56px] flex items-center justify-between gap-1 px-3 sm:px-4 bg-white/5 border border-white/10 text-white rounded-l-xl hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#ffb902]/50 z-20"
                  >
                    <span className="text-xl sm:text-2xl">{selectedCountry.flag}</span>
                    <span className="text-xs sm:text-sm font-semibold tracking-wide">{selectedCountry.code}</span>
                    <svg className={`w-3 h-3 sm:w-4 h-4 text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu with Search */}
                  {isDropdownOpen && (
                    <div className="absolute top-[60px] left-0 w-[280px] sm:w-[300px] bg-[#001232] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      
                      {/* Search Bar for Mobile Accessibility */}
                      <div className="p-3 border-b border-white/10 bg-white/5">
                        <input 
                          type="text" 
                          placeholder="Search country..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-[#001232] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ffb902]"
                        />
                      </div>

                      <ul className="max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {filteredCountries.length > 0 ? filteredCountries.map((country, index) => (
                          <li key={index}>
                            {/* Visual Divider after Priority Countries */}
                            {index === 5 && !searchQuery && <div className="h-px bg-white/10 my-1 mx-4"></div>}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCountry(country);
                                setIsDropdownOpen(false);
                                setSearchQuery(""); // Reset search
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors"
                            >
                              <span className="text-2xl">{country.flag}</span>
                              <span className="text-sm text-gray-200 flex-1 font-medium">{country.name}</span>
                              <span className="text-xs text-gray-400 font-mono">{country.code}</span>
                            </button>
                          </li>
                        )) : (
                          <li className="px-4 py-4 text-center text-sm text-gray-500">No countries found</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Phone Input */}
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d\s]/g, ''))} // Allow numbers and spaces
                  placeholder="801 234 5678"
                  className="flex-1 w-full h-[56px] px-4 sm:px-5 bg-white/5 border border-l-0 border-white/10 text-white text-lg rounded-r-xl focus:outline-none focus:ring-2 focus:ring-[#ffb902]/50 focus:bg-white/10 placeholder-gray-600 transition-all z-10"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm animate-in slide-in-from-top-2">
                <p className="text-sm font-medium text-red-400 text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full h-[56px] flex justify-center items-center font-bold text-lg rounded-xl transition-all duration-300 transform active:scale-[0.98] ${
                loading 
                  ? "bg-white/10 text-gray-500 cursor-not-allowed border border-white/5" 
                  : "bg-[#ffb902] text-[#001232] hover:bg-[#ffc833] hover:shadow-[0_0_20px_rgba(255,185,2,0.3)]"
              }`}
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-[#001232]/20 border-t-[#001232] rounded-full animate-spin"></div>
              ) : (
                "Authenticate & Begin"
              )}
            </button>
          </form>
        )}
      </div>
      
      {/* Footer Branding */}
      <div className="mt-8 text-center z-10 pb-6">
        <p className="text-[11px] text-gray-500 tracking-widest uppercase font-semibold">
          Powered by
        </p>
        <p className="text-sm font-bold text-gray-400 mt-1">
          Quadrox Technologies
        </p>
      </div>
    </main>
  );
}
