import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";

interface SignupFormProps {
  onSwitchToLogin?: () => void;
}

const passwordChecks = (password: string) => ({
  length: password.length >= 8,
  upper: /[A-Z]/.test(password),
  lower: /[a-z]/.test(password),
  number: /[0-9]/.test(password),
  special: /[^A-Za-z0-9]/.test(password),
});

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [createdEmail, setCreatedEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const checks = passwordChecks(form.password);
  const strength = Object.values(checks).filter(Boolean).length;
  const strengthLabel =
    strength <= 1
      ? "Very weak"
      : strength <= 2
        ? "Weak"
        : strength <= 3
          ? "Fair"
          : strength <= 4
            ? "Strong"
            : "Very strong";
  const strengthColor =
    strength <= 1
      ? "bg-red-500"
      : strength <= 2
        ? "bg-orange-500"
        : strength <= 3
          ? "bg-amber-500"
          : strength <= 4
            ? "bg-emerald-500"
            : "bg-emerald-600";

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    if (error) {
      setError("");
    }

    if (fieldErrors[e.target.name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[e.target.name];
        return next;
      });
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!form.firstName.trim()) {
      errors.firstName = "Required";
    }

    if (!form.lastName.trim()) {
      errors.lastName = "Required";
    }

    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Valid email required";
    }

    if (strength < 3) {
      errors.password = "Password is too weak";
    }

    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords don't match";
    }

    return errors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const user = await backendApi.signUp({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setCreatedEmail(user.email);
      setSuccess(true);
    } catch (submitError) {
      setError(
        getApiErrorMessage(submitError, "Could not create your account."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-5 py-8">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-8 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Account created</h2>
          <p className="text-sm text-gray-500 mt-1">
            Your account is ready for{" "}
            <span className="font-semibold text-gray-700">{createdEmail}</span>
          </p>
        </div>
        <p className="text-xs text-gray-400 max-w-xs mx-auto">
          Email verification is not enabled in the backend yet, so you can sign
          in immediately.
        </p>
        <button
          onClick={onSwitchToLogin}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
          Create your account
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Create a workspace account with the fields supported by the backend
          today.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First name" error={fieldErrors.firstName}>
            <InputWrapper icon={<User className="size-3.5 text-gray-400" />}>
              <input
                name="firstName"
                placeholder="Alex"
                value={form.firstName}
                onChange={handleChange}
                disabled={isLoading}
                autoComplete="given-name"
                className={inputCls}
              />
            </InputWrapper>
          </FormField>

          <FormField label="Last name" error={fieldErrors.lastName}>
            <InputWrapper>
              <input
                name="lastName"
                placeholder="Kim"
                value={form.lastName}
                onChange={handleChange}
                disabled={isLoading}
                autoComplete="family-name"
                className={inputCls}
              />
            </InputWrapper>
          </FormField>
        </div>

        <FormField label="Work email" error={fieldErrors.email}>
          <InputWrapper icon={<Mail className="size-4 text-gray-400" />}>
            <input
              name="email"
              type="email"
              placeholder="alex@acme.com"
              value={form.email}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="email"
              className={inputCls}
            />
          </InputWrapper>
        </FormField>

        <FormField label="Password" error={fieldErrors.password}>
          <InputWrapper
            icon={<Lock className="size-4 text-gray-400" />}
            trailing={
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                {showPw ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            }
          >
            <input
              name="password"
              type={showPw ? "text" : "password"}
              placeholder="Min 8 characters"
              value={form.password}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="new-password"
              className={inputCls}
            />
          </InputWrapper>

          {form.password && (
            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-all duration-300",
                        index < strength ? strengthColor : "bg-gray-200",
                      )}
                    />
                  ))}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    strength <= 2
                      ? "text-red-600"
                      : strength <= 3
                        ? "text-amber-600"
                        : "text-emerald-600",
                  )}
                >
                  {strengthLabel}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {[
                  { key: "length", label: "8+ characters" },
                  { key: "upper", label: "Uppercase" },
                  { key: "lower", label: "Lowercase" },
                  { key: "number", label: "Number" },
                  { key: "special", label: "Special char" },
                ].map(({ key, label }) => (
                  <span
                    key={key}
                    className={cn(
                      "flex items-center gap-1 text-[11px] font-medium",
                      checks[key as keyof typeof checks]
                        ? "text-emerald-600"
                        : "text-gray-400",
                    )}
                  >
                    <span
                      className={cn(
                        "w-1 h-1 rounded-full",
                        checks[key as keyof typeof checks]
                          ? "bg-emerald-500"
                          : "bg-gray-300",
                      )}
                    />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </FormField>

        <FormField
          label="Confirm password"
          error={fieldErrors.confirmPassword}
        >
          <InputWrapper
            icon={<Lock className="size-4 text-gray-400" />}
            trailing={
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                {showConfirm ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            }
          >
            <input
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="new-password"
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
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <button
          onClick={onSwitchToLogin}
          className="text-indigo-600 hover:text-indigo-700 font-semibold"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}

const inputCls =
  "flex-1 min-w-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none py-2.5";

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
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
