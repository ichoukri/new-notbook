import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/api", () => ({
  backendApi: {
    get: vi.fn(),
    put: vi.fn(),
    create: vi.fn(),
  },
}));

import { backendApi } from "@/core/api";
import {
  SettingsRevisionConflict,
  saveProviderSettings,
  testProviderSettings,
} from "./settings";

describe("provider settings API client", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends the expected revision and explicit re-index acknowledgement", async () => {
    vi.mocked(backendApi.put).mockResolvedValue({});

    await saveProviderSettings(
      { ollama_base_url: "http://gpu-01:11434" },
      { expectedRevision: 7, acknowledgeReindex: true },
    );

    expect(backendApi.put).toHaveBeenCalledWith("/settings/runtime", {
      values: { ollama_base_url: "http://gpu-01:11434" },
      acknowledge_reindex: true,
      expected_revision: 7,
    });
  });

  it("turns a structured 409 into a revision-conflict error", async () => {
    vi.mocked(backendApi.put).mockRejectedValue(
      new AxiosError("Conflict", undefined, undefined, undefined, {
        status: 409,
        data: {
          detail: {
            code: "settings_revision_conflict",
            message: "Reload the latest revision.",
          },
        },
      } as never),
    );

    await expect(
      saveProviderSettings({}, { expectedRevision: 2 }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<SettingsRevisionConflict>>({
        name: "SettingsRevisionConflict",
        message: "Reload the latest revision.",
      }),
    );
  });

  it("requests only the endpoints owned by the selected provider pane", async () => {
    vi.mocked(backendApi.create).mockResolvedValue({ results: [] });

    await testProviderSettings(
      { vllm_chat_base_url: "http://localhost:8003/v1" },
      ["vllm_chat", "qwen_embedding"],
    );

    expect(backendApi.create).toHaveBeenCalledWith("/settings/providers/test", {
      values: { vllm_chat_base_url: "http://localhost:8003/v1" },
      targets: ["vllm_chat", "qwen_embedding"],
    });
  });
});
