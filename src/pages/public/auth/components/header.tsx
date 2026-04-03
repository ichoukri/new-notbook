import { Icon } from "@/components/icons";
import { LanguageSwitcher } from "@/components/layout/header/language-switcher";
import { Toggle } from "@/components/layout/header/toggle";
import { useModeStore } from "@/core/mode.store";

// Floating auth header with logo + controls
export function Header() {
  const resolvedTheme = useModeStore((s) => s.resolvedTheme);
  const isDark = resolvedTheme === "dark";

  return (
    <header className="flex w-full items-center justify-between px-6 py-4">
      {/* Logo — visible on mobile, hidden on lg where branding panel shows it */}
      <div className="lg:invisible">
        <Icon name={isDark ? "logodark" : "logolight"} />
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <Toggle />
      </div>
    </header>
  );
}
