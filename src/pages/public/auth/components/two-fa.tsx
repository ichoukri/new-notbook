import { useState, useRef, useEffect, type KeyboardEvent, type ClipboardEvent } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck, RefreshCw, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface TwoFAFormProps {
  onBack?: () => void;
  userEmail?: string;
}

const CODE_LENGTH = 6;

export function TwoFAForm({ onBack, userEmail = "alex@acme.com" }: TwoFAFormProps) {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const joinedCode = code.join("");

  const startCountdown = () => {
    setResendCountdown(30);
    const id = setInterval(() => {
      setResendCountdown((p) => { if (p <= 1) { clearInterval(id); return 0; } return p - 1; });
    }, 1000);
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (error) setError("");
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-submit when full
    if (digit && index === CODE_LENGTH - 1) {
      const full = [...next].join("");
      if (full.length === CODE_LENGTH) handleVerify(full);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (code[index]) {
        const next = [...code]; next[index] = ""; setCode(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        const next = [...code]; next[index - 1] = ""; setCode(next);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = [...code];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setCode(next);
    const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
    if (pasted.length === CODE_LENGTH) handleVerify(pasted);
  };

  const handleVerify = async (codeStr?: string) => {
    const toVerify = codeStr ?? joinedCode;
    if (toVerify.length !== CODE_LENGTH) {
      setError("Please enter all 6 digits.");
      return;
    }
    setIsLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 900));
    setIsLoading(false);
    if (toVerify === "123456") {
      setSuccess(true);
    } else {
      setError("Invalid code. Please try again.");
      setCode(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-5 py-8">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldCheck className="size-8 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Verified!</h2>
          <p className="text-sm text-gray-500 mt-1">Identity confirmed. Redirecting to your workspace…</p>
        </div>
        <div className="flex justify-center">
          <svg className="animate-spin size-5 text-indigo-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to sign in
      </button>

      <div className="flex flex-col items-start gap-4">
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
          <Smartphone className="size-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Two-factor authentication</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Enter the 6-digit code from your authenticator app. Signing in as{" "}
            <span className="font-semibold text-gray-700">{userEmail}</span>
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* OTP input grid */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Authentication code</label>
          <div className="flex items-center gap-2.5" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={isLoading}
                className={cn(
                  "w-full aspect-square text-center text-xl font-bold rounded-xl border-2 transition-all outline-none",
                  "bg-gray-50 text-gray-900",
                  digit
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 focus:border-indigo-400 focus:bg-white focus:ring-3 focus:ring-indigo-50",
                  isLoading && "opacity-60 cursor-not-allowed",
                  error && "border-red-300 bg-red-50"
                )}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400">Tip: You can paste your 6-digit code directly</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={() => handleVerify()}
          disabled={isLoading || joinedCode.length !== CODE_LENGTH}
          className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md shadow-indigo-200"
        >
          {isLoading ? (
            <><svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>Verifying…</>
          ) : (
            <>Verify identity <ArrowRight className="size-4" /></>
          )}
        </button>

        {/* Backup + resend */}
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => { if (resendCountdown === 0) startCountdown(); }}
            disabled={resendCountdown > 0}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="size-3.5" />
            {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend code"}
          </button>
          <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Use backup code
          </a>
        </div>

        {/* Hint box */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <ShieldCheck className="size-5 text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-700">Demo hint</p>
            <p className="text-xs text-gray-500 mt-0.5">Use code <strong className="font-mono text-indigo-700">123456</strong> to simulate a successful verification.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
