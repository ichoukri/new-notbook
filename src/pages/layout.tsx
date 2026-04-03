import { Outlet } from "react-router";
import { Toaster } from "sonner";

export default function GlobalLayout() {
  return (
    <div className="min-h-screen flex flex-col dark bg-background text-foreground">
      <Outlet />
      <Toaster
        richColors
        toastOptions={{
          className: "!bg-card border",
          classNames: {
            success: "!text-green-400 !border-green-400",
            error: "!text-red-400 !border-red-400",
            loading: "!text-yellow-400 !border-yellow-400",
            info: "!text-blue-400 !border-blue-400",
          },
        }}
      />
    </div>
  );
}
