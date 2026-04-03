import axios from "axios";

export function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    if (Array.isArray(detail)) {
      const [firstError] = detail;
      if (
        firstError &&
        typeof firstError === "object" &&
        "msg" in firstError &&
        typeof firstError.msg === "string"
      ) {
        return firstError.msg;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
