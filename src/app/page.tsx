// src/app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [examResult, setExamResult] = useState<{ score: number; placement: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setExamResult(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (res.ok) {
        // Successful login, redirect to the exam portal
        router.push("/exam");
      } else if (res.status === 403) {
        // Exam already taken, show their result instead of an error
        setExamResult({
          score: data.score,
          placement: data.placement,
        });
      } else {
        // General error (e.g., number not found)
        setError(data.error || "Failed to authenticate.");
      }
    } catch (err) {
      setError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            INSTITUTE OF MUTOON
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Entrance Examination Portal
          </p>
        </div>

        {/* If the student already took the exam, show this instead of the form */}
        {examResult ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">Exam Completed</h2>
            <p className="text-blue-800 mb-4">You have already submitted your examination.</p>
            <div className="bg-white rounded p-4 border border-blue-100">
              <p className="text-sm text-gray-500 mb-1">Final Score</p>
              <p className="text-3xl font-bold text-gray-900 mb-4">{examResult.score}%</p>
              <p className="text-sm text-gray-500 mb-1">Placement Recommendation</p>
              <p className="text-lg font-medium text-blue-700">{examResult.placement}</p>
            </div>
            <button 
              onClick={() => setExamResult(null)}
              className="mt-6 text-sm text-blue-600 hover:underline"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Registered Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 08012345678"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 text-white font-medium rounded-lg transition-colors ${
                loading ? "bg-gray-400 cursor-not-allowed" : "bg-gray-900 hover:bg-gray-800"
              }`}
            >
              {loading ? "Verifying..." : "Start Examination"}
            </button>
          </form>
        )}
      </div>
      
      <p className="text-xs text-gray-400 mt-8">
        Quadrox Tech secure examination infrastructure.
      </p>
    </main>
  );
}
