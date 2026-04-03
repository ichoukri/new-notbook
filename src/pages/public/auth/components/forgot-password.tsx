import { useState, type FormEvent } from "react";
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";

interface ForgotPasswordFormProps {
  onBack?: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setIsLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 1000));
    setIsLoading(false);
    setSent(true);
    startCountdown();
  };

  const startCountdown = () => {
    setResendCountdown(60);
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsLoading(false);
    startCountdown();
  };

  if (sent) {
    return (
      <div className="space-y-7">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </button>

        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto">
            <Mail className="size-7 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
              We sent a password reset link to{" "}
              <span className="font-semibold text-gray-700">{email}</span>
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
            <p className="text-xs text-amber-800 font-semibold mb-1">Didn't receive it?</p>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>· Check your spam or junk folder</li>
              <li>· Make sure you typed the email correctly</li>
              <li>· The link expires in 1 hour</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleResend}
              disabled={resendCountdown > 0 || isLoading}
              className="flex items-center justify-center gap-2 w-full h-11 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-xl text-sm font-medium text-gray-700 transition-all"
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              {resendCountdown > 0
                ? `Resend in ${resendCountdown}s`
                : isLoading ? "Sending…" : "Resend email"
              }
            </button>
            <button
              onClick={onBack}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md shadow-indigo-200"
            >
              Back to sign in
              <ArrowRight className="size-4" />
            </button>
          </div>
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

      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Reset your password</h2>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
          Enter your account email and we'll send you a secure link to choose a new password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Email address</label>
          <div className="flex items-center gap-2.5 h-11 bg-gray-50 border border-gray-200 rounded-xl px-3.5 focus-within:bg-white focus-within:border-indigo-400 focus-within:ring-3 focus-within:ring-indigo-50 transition-all">
            <Mail className="size-4 text-gray-400 flex-shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
              placeholder="alex@acme.com"
              disabled={isLoading}
              autoComplete="email"
              autoFocus
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none py-2.5"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md shadow-indigo-200"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Sending reset link…
            </>
          ) : (
            <>
              Send reset link
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </form>

      <div className="flex items-center gap-3 bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <CheckCircle2 className="size-5 text-indigo-500 flex-shrink-0" />
        <p className="text-xs text-indigo-700 leading-relaxed">
          For security, the reset link expires in <strong>1 hour</strong> and can only be used once.
        </p>
      </div>
    </div>
  );
}
