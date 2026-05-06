import { useEffect } from "react";
import { Outlet } from "react-router";
import Sidebar from "@/components/app/sidebar";
import { backendApi, classifyAuthError } from "@/core/api";
import { useGlobalStore } from "@/core/global-store/index";
import LoadingPage from "@/pages/loading";
import { Button } from "@/components/ui/button";

export default function PrivateLayout() {
  const user = useGlobalStore((state) => state.user);
  const setUser = useGlobalStore((state) => state.setUser);
  const authError = useGlobalStore((state) => state.authError);
  const setAuthError = useGlobalStore((state) => state.setAuthError);

  useEffect(() => {
    if (user !== undefined) return;

    backendApi
      .fetchMe()
      .then((u) => {
        setAuthError(null);
        setUser(u);
      })
      .catch((error) => {
        // 401 is handled by the axios interceptor (redirect to login).
        // For everything else, surface a clear error state instead of looping.
        if (error?.response?.status === 401) return;
        setAuthError(classifyAuthError(error));
        setUser(null);
      });
  }, [user, setUser, setAuthError]);

  if (user === undefined) {
    return <LoadingPage />;
  }

  if (!user) {
    if (authError) return <AuthErrorState kind={authError} />;
    // No user and no error means the 401 redirect is in flight.
    return <LoadingPage />;
  }

  return (
    <div className="h-screen bg-[#e8e9ee] flex overflow-hidden p-2 gap-2">
      {/* Sidebar panel */}
      <div className="w-60 flex-shrink-0 bg-white rounded-2xl overflow-hidden flex flex-col ring-1 ring-black/[0.05]">
        <Sidebar />
      </div>

      {/* Main content panel */}
      <div className="flex-1 min-w-0 flex flex-col bg-white rounded-2xl overflow-hidden ring-1 ring-black/[0.05]">
        <Outlet />
      </div>
    </div>
  );
}

const ERROR_COPY = {
  forbidden: {
    title: "Access denied",
    message:
      "Your account isn't associated with a workspace, or you don't have permission to access this app. Contact your administrator to get access.",
    showSignOut: true,
  },
  unavailable: {
    title: "Authentication service unavailable",
    message:
      "We can't reach the authentication service right now. Please try again in a moment.",
    showSignOut: false,
  },
  unknown: {
    title: "Something went wrong",
    message:
      "We couldn't load your account. Please try again, and if the problem persists, contact support.",
    showSignOut: true,
  },
} as const;

function AuthErrorState({ kind }: { kind: keyof typeof ERROR_COPY }) {
  const setUser = useGlobalStore((state) => state.setUser);
  const setAuthError = useGlobalStore((state) => state.setAuthError);
  const copy = ERROR_COPY[kind];

  const retry = () => {
    setAuthError(null);
    setUser(undefined);
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#e8e9ee] p-6">
      <div className="max-w-md w-full bg-white rounded-2xl ring-1 ring-black/5 p-8 text-center">
        <h1 className="text-lg font-semibold text-gray-900">{copy.title}</h1>
        <p className="mt-2 text-sm text-gray-600">{copy.message}</p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button onClick={retry} variant="default">
            Try again
          </Button>
          {copy.showSignOut && (
            <Button onClick={() => backendApi.signOut()} variant="outline">
              Sign out
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
