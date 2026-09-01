import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/settings", () => ({
  fetchProviderSettings: vi.fn(),
  saveProviderSettings: vi.fn(),
  describeSettingsError: (error: unknown) => String(error),
  ReindexConfirmationRequired: class extends Error {},
  SettingsRevisionConflict: class extends Error {},
}));

import {
  fetchProviderSettings,
  saveProviderSettings,
  type TProviderSettings,
} from "@/core/settings";
import { PROJECT_SETTINGS_SECTIONS } from "./project-settings-config";
import { ProjectSettingsPanel } from "./project-settings-panel";

const SETTINGS: TProviderSettings = {
  revision: 4,
  updated_at: null,
  updated_by: null,
  encryption_available: true,
  editable_fields: [
    "chat_model",
    "max_file_size_upload",
    "s3_presigned_upload_expiration_seconds",
  ],
  secret_fields: [],
  values: {
    chat_model: "qwen3",
    max_file_size_upload: 1024,
    s3_presigned_upload_expiration_seconds: 900,
  },
  environment_values: {
    chat_model: "qwen3",
    max_file_size_upload: 512,
    s3_presigned_upload_expiration_seconds: 900,
  },
  sources: {
    chat_model: "settings",
    max_file_size_upload: "settings",
    s3_presigned_upload_expiration_seconds: "env",
  },
  collections: {},
  managed_values: {},
};

const STORAGE_SECTION = PROJECT_SETTINGS_SECTIONS.find(
  (section) => section.id === "storage",
)!;

describe("project settings panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchProviderSettings).mockResolvedValue(SETTINGS);
    vi.mocked(saveProviderSettings).mockResolvedValue({
      ...SETTINGS,
      reindex_required: [],
    });
  });

  it("preserves overrides from other sections when saving a changed field", async () => {
    render(<ProjectSettingsPanel section={STORAGE_SECTION} />);

    const maxSize = await screen.findByLabelText("Maximum upload size");
    fireEvent.change(maxSize, { target: { value: "2048" } });
    fireEvent.click(screen.getByRole("button", { name: /Save changes/ }));

    await waitFor(() => expect(saveProviderSettings).toHaveBeenCalledTimes(1));
    expect(saveProviderSettings).toHaveBeenCalledWith(
      {
        chat_model: "qwen3",
        max_file_size_upload: 2048,
      },
      { expectedRevision: 4 },
    );
  });

  it("can remove a saved field and return it to the environment value", async () => {
    render(<ProjectSettingsPanel section={STORAGE_SECTION} />);

    await screen.findByLabelText("Maximum upload size");
    fireEvent.click(screen.getByRole("button", { name: "Use environment" }));
    expect(screen.getByLabelText("Maximum upload size")).toHaveValue(512);
    fireEvent.click(screen.getByRole("button", { name: /Save changes/ }));

    await waitFor(() => expect(saveProviderSettings).toHaveBeenCalledTimes(1));
    expect(saveProviderSettings).toHaveBeenCalledWith(
      { chat_model: "qwen3" },
      { expectedRevision: 4 },
    );
  });
});
