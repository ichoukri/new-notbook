import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";

interface LoginFormProps {
  onSwitchToSignUp?: () => void;
}

export function LoginForm({ onSwitchToSignUp }: LoginFormProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.email.trim() || !form.password) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await backendApi.signIn({
        email: form.email.trim(),
        password: form.password,
      });
      navigate("/", { replace: true });
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Could not sign in."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
          Welcome back
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Sign in to your VectorFlow workspace with your email and password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Work email">
          <InputWrapper icon={<Mail className="size-4 text-gray-400" />}>
            <input
              name="email"
              type="email"
              placeholder="alex@acme.com"
              value={form.email}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="email"
              autoFocus
              className={inputCls}
            />
          </InputWrapper>
        </FormField>

        <FormField label="Password">
          <InputWrapper
            icon={<Lock className="size-4 text-gray-400" />}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            }
          >
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="current-password"
              className={inputCls}
            />
          </InputWrapper>
        </FormField>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md shadow-indigo-200"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <button
          onClick={onSwitchToSignUp}
          className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
        >
          Create one free
        </button>
      </p>
    </div>
  );
}

const inputCls =
  "flex-1 min-w-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none py-2.5";

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

function InputWrapper({
  icon,
  trailing,
  children,
}: {
  icon?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 h-11 bg-gray-50 border border-gray-200 rounded-xl px-3.5 focus-within:bg-white focus-within:border-indigo-400 focus-within:ring-3 focus-within:ring-indigo-50 transition-all">
      {icon}
      {children}
      {trailing}
    </div>
  );
}
