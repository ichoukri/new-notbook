import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/core/settings", () => ({
  fetchProviderSettings: vi.fn(),
  saveProviderSettings: vi.fn(),
  testProviderSettings: vi.fn(),
  describeSettingsError: (e: unknown) => String(e),
  ReindexConfirmationRequired: class extends Error {},
  SettingsRevisionConflict: class extends Error {},
}));

import {
  fetchProviderSettings,
  saveProviderSettings,
  testProviderSettings,
  type TProviderSettings,
} from "@/core/settings";
import { ProviderSettingsPanel } from "./provider-settings-panel";

const SETTINGS: TProviderSettings = {
  revision: 2,
  updated_at: "2026-08-31T00:00:00Z",
  updated_by: "someone@example.com",
  encryption_available: true,
  editable_fields: [
    "openai_enabled",
    "ollama_enabled",
    "vllm_enabled",
    "openai_api_key",
    "embedding_model",
    "embedding_dimensions",
    "openai_summary_model",
    "ollama_base_url",
    "chat_model",
    "chat_provider",
    "graph_extraction_provider",
    "graph_extraction_model",
    "summary_batch_size",
    "chat_model_temperature",
    "vllm_chat_base_url",
  ],
  secret_fields: ["openai_api_key"],
  values: {
    openai_enabled: true,
    ollama_enabled: true,
    vllm_enabled: true,
    openai_api_key: "sk-…4f2a",
    embedding_model: "text-embedding-3-large",
    embedding_dimensions: 1536,
    openai_summary_model: "gpt-4.1-mini",
    ollama_base_url: "http://localhost:11434",
    chat_model: "qwen3-vl:30b",
    chat_provider: "ollama",
    graph_extraction_provider: "ollama",
    graph_extraction_model: "qwen3-vl:30b",
    summary_batch_size: 1,
    chat_model_temperature: 0,
    vllm_chat_base_url: "http://localhost:8003/v1",
  },
  environment_values: {
    openai_enabled: true,
    ollama_enabled: true,
    vllm_enabled: true,
    openai_api_key: "sk-…4f2a",
    embedding_model: "text-embedding-3-large",
    embedding_dimensions: 3072,
    openai_summary_model: "gpt-4.1-mini",
    ollama_base_url: "http://localhost:11434",
    chat_model: "qwen3-vl:30b",
    chat_provider: "ollama",
    graph_extraction_provider: "ollama",
    graph_extraction_model: "qwen3-vl:30b",
    summary_batch_size: 1,
    chat_model_temperature: 0,
    vllm_chat_base_url: "http://localhost:8003/v1",
  },
  sources: { embedding_dimensions: "settings", ollama_base_url: "env" },
  collections: { openai: "notebook_collection", ollama: "notebook_collection_ollama", qwen: "notebook_collection_qwen" },
  managed_values: {},
};

describe("provider settings panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchProviderSettings).mockResolvedValue(SETTINGS);
    vi.mocked(saveProviderSettings).mockResolvedValue({
      ...SETTINGS,
      reindex_required: [],
    });
    vi.mocked(testProviderSettings).mockResolvedValue([]);
  });

  it("renders the rail, opens a provider, and groups its fields", async () => {
    render(<ProviderSettingsPanel />);
    await waitFor(() => expect(screen.getAllByText("OpenAI").length).toBeGreaterThan(0));

    // Rail lists all three providers plus the tasks pane.
    for (const label of ["OpenAI", "Ollama", "vLLM", "Tasks"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    // First provider is open, with its fields grouped into sections.
    expect(screen.getByText("Connection")).toBeInTheDocument();
    expect(screen.getByText("Models")).toBeInTheDocument();
    expect(screen.getByText("notebook_collection")).toBeInTheDocument();

    // The saved-vs-env provenance badge renders.
    expect(screen.getAllByText("Saved").length).toBeGreaterThan(0);
  });

  it("switches panes and tracks unsaved changes per pane", async () => {
    render(<ProviderSettingsPanel />);
    await waitFor(() => expect(screen.getAllByText("OpenAI").length).toBeGreaterThan(0));

    expect(screen.getByText(/coming from the service environment|Saved by/)).toBeInTheDocument();

    // Move to Ollama and edit its base URL.
    fireEvent.click(screen.getByRole("button", { name: /Ollama/ }));
    const url = await screen.findByDisplayValue("http://localhost:11434");
    fireEvent.change(url, { target: { value: "http://gpu-01:11434" } });

    expect(await screen.findByText("1 unsaved change")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save changes/ })).toBeEnabled();

    // Discard restores the loaded values.
    fireEvent.click(screen.getByRole("button", { name: /Discard/ }));
    await waitFor(() =>
      expect(screen.queryByText("1 unsaved change")).not.toBeInTheDocument(),
    );
  });

  it("greys out a provider that is switched off", async () => {
    render(<ProviderSettingsPanel />);
    await waitFor(() => expect(screen.getAllByText("OpenAI").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("switch", { name: "Enable OpenAI" }));
    // Shown twice on purpose: on the rail entry and in the pane header.
    await waitFor(() =>
      expect(screen.getAllByText("Off").length).toBeGreaterThan(0),
    );
    expect(screen.getByLabelText("Embedding model")).toBeDisabled();
  });

  it("saves only existing overrides and fields intentionally changed", async () => {
    render(<ProviderSettingsPanel />);
    await waitFor(() => expect(screen.getAllByText("OpenAI").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: /Ollama/ }));
    fireEvent.change(await screen.findByLabelText("Base URL"), {
      target: { value: "http://gpu-01:11434" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save changes/ }));

    await waitFor(() => expect(saveProviderSettings).toHaveBeenCalledTimes(1));
    expect(saveProviderSettings).toHaveBeenCalledWith(
      {
        embedding_dimensions: 1536,
        ollama_base_url: "http://gpu-01:11434",
      },
      { expectedRevision: 2 },
    );
  });

  it("can remove a saved override and restore the environment baseline", async () => {
    render(<ProviderSettingsPanel />);
    await waitFor(() => expect(screen.getAllByText("OpenAI").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: "Use environment" }));
    expect(screen.getByLabelText("Embedding dimensions")).toHaveValue(3072);
    fireEvent.click(screen.getByRole("button", { name: /Save changes/ }));

    await waitFor(() => expect(saveProviderSettings).toHaveBeenCalledTimes(1));
    expect(saveProviderSettings).toHaveBeenCalledWith(
      {},
      { expectedRevision: 2 },
    );
  });

  it("prevents disabling a provider while tasks are assigned to it", async () => {
    render(<ProviderSettingsPanel />);
    await waitFor(() => expect(screen.getAllByText("OpenAI").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: /Ollama/ }));
    fireEvent.click(screen.getByRole("switch", { name: "Enable Ollama" }));

    expect(await screen.findByText("Task assignment")).toBeInTheDocument();
    expect(screen.queryByText("1 unsaved change")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Chat provider")).toHaveValue("ollama");
  });

  it("tests both vLLM endpoints and renders diagnostic details", async () => {
    vi.mocked(testProviderSettings).mockResolvedValue([
      {
        target: "vllm_chat",
        online: true,
        detail: "Reachable at http://localhost:8003/v1",
        served_models: ["chat-model"],
        configured_models: ["chat-model"],
        missing_models: [],
        model_available: true,
      },
      {
        target: "qwen_embedding",
        online: false,
        detail: "No authenticated response from http://localhost:8002/v1",
        served_models: [],
        configured_models: ["embed-model"],
        missing_models: [],
        model_available: null,
      },
    ]);
    render(<ProviderSettingsPanel />);
    await waitFor(() => expect(screen.getAllByText("OpenAI").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: /vLLM/ }));
    fireEvent.click(screen.getByRole("button", { name: "Test" }));

    await waitFor(() =>
      expect(testProviderSettings).toHaveBeenCalledWith(
        SETTINGS.values,
        ["vllm_chat", "qwen_embedding"],
      ),
    );
    expect(await screen.findByText("Reachable at http://localhost:8003/v1")).toBeInTheDocument();
    expect(screen.getByText(/No authenticated response/)).toBeInTheDocument();
  });

  it("hides secret input values until explicitly revealed", async () => {
    render(<ProviderSettingsPanel />);
    await waitFor(() => expect(screen.getAllByText("OpenAI").length).toBeGreaterThan(0));

    const keyInput = screen.getByLabelText("API key");
    expect(keyInput).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show API key" }));
    expect(keyInput).toHaveAttribute("type", "text");
  });
});
