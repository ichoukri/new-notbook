import { describe, expect, it } from "vitest";
import type { TBackendDataset } from "@/core/datasets";
import {
  persistDatasetUpdate,
  type DatasetUpdateApi,
} from "./dataset-update-client";

function backendDataset(
  metadata: Record<string, unknown>,
): TBackendDataset {
  return {
    id: "dataset-1",
    name: "Maintenance corpus",
    tenant_id: "tenant-1",
    created_by: "user-1",
    status: "active",
    created_at: "2026-08-10T10:00:00Z",
    updated_at: "2026-08-10T10:01:00Z",
    dataset_metadata: metadata,
  };
}

function recordingApi(responses: TBackendDataset[]) {
  const calls: Array<{
    method: "patch";
    path: string;
    data: unknown;
  }> = [];
  let responseIndex = 0;
  const nextResponse = <TResponse,>() =>
    responses[responseIndex++] as TResponse;

  const api: DatasetUpdateApi = {
    async patch<TResponse, TInput>(path: string, data: TInput) {
      calls.push({ method: "patch", path, data });
      return nextResponse<TResponse>();
    },
  };

  return { api, calls };
}

describe("persistDatasetUpdate", () => {
  it("routes the complete edit through one atomic editor request", async () => {
    const finalResponse = backendDataset({
      versions: [{ event: "dataset_custom_metadata_updated" }],
      agent_profile: "maintenance",
      owner: "reliability",
    });
    finalResponse.name = "Renamed corpus";
    const { api, calls } = recordingApi([finalResponse]);

    const result = await persistDatasetUpdate(
      api,
      "dataset-1",
      {
        expected_updated_at: "2026-08-10T10:00:00Z",
        name: "Renamed corpus",
        description: null,
        status: "active",
        tags: ["maintenance"],
        agent_profile: "maintenance",
        custom_metadata: { owner: "reliability" },
      },
    );

    expect(result).toBe(finalResponse);
    expect(calls).toEqual([
      {
        method: "patch",
        path: "/datasets/dataset-1/editor",
        data: {
          expected_updated_at: "2026-08-10T10:00:00Z",
          name: "Renamed corpus",
          description: null,
          status: "active",
          tags: ["maintenance"],
          agent_profile: "maintenance",
          custom_metadata: { owner: "reliability" },
        },
      },
    ]);
  });

  it("omits the custom snapshot while still making one atomic save", async () => {
    const finalResponse = backendDataset({ agent_profile: "generic" });
    const { api, calls } = recordingApi([finalResponse]);

    await persistDatasetUpdate(
      api,
      "dataset-1",
      {
        expected_updated_at: "2026-08-10T10:00:00Z",
        name: "Maintenance corpus",
        status: "active",
        description: null,
        tags: null,
        agent_profile: "generic",
      },
    );

    expect(calls).toEqual([
      {
        method: "patch",
        path: "/datasets/dataset-1/editor",
        data: {
          expected_updated_at: "2026-08-10T10:00:00Z",
          name: "Maintenance corpus",
          status: "active",
          description: null,
          tags: null,
          agent_profile: "generic",
        },
      },
    ]);
  });
});
