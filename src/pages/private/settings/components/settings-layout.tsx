import { useState, type ReactNode } from "react";
import { CheckCircle2, Save, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type SettingsSectionProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  onSave: () => void;
  saved: boolean;
};

export function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
  onSave,
  saved,
}: SettingsSectionProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-50 bg-gray-50/40 px-6 py-5">
        <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50">
          <Icon className="size-4 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
      </div>

      <div className="space-y-0 divide-y divide-gray-50 px-6 py-4">
        {children}
      </div>

      <div className="flex items-center justify-between border-t border-gray-50 bg-gray-50/30 px-6 py-4">
        <p className="text-xs text-gray-400">
          Changes are applied to new ingestions only
        </p>
        <Button
          size="sm"
          className={cn(
            "min-w-32 gap-2 transition-all",
            saved ? "bg-emerald-600 hover:bg-emerald-600" : "",
          )}
          onClick={onSave}
        >
          {saved ? (
            <>
              <CheckCircle2 className="size-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

type SettingRowProps = {
  label: string;
  description: string;
  children: ReactNode;
};

export function SettingRow({
  label,
  description,
  children,
}: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-6 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

type SettingSliderProps = {
  label: string;
  description: string;
  min: number;
  max: number;
  defaultValue: number;
};

export function SettingSlider({
  label,
  description,
  min,
  max,
  defaultValue,
}: SettingSliderProps) {
  const [value, setValue] = useState([defaultValue]);

  return (
    <div className="flex items-center justify-between gap-6 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
      </div>
      <div className="flex w-60 flex-shrink-0 items-center gap-3">
        <Slider
          value={value}
          onValueChange={setValue}
          min={min}
          max={max}
          step={32}
          className="flex-1"
        />
        <span className="w-14 text-right text-sm font-semibold tabular-nums text-indigo-700">
          {value[0]}
        </span>
      </div>
    </div>
  );
}
