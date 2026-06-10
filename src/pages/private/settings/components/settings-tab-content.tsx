import { Bell, Box, Cpu, Layers, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { SettingsTabId } from "./settings-config";
import { SettingRow, SettingsSection, SettingSlider } from "./settings-layout";

type SettingsTabContentProps = {
  activeTab: SettingsTabId;
  onSave: () => void;
  saved: boolean;
};

export function SettingsTabContent({
  activeTab,
  onSave,
  saved,
}: SettingsTabContentProps) {
  if (activeTab === "models") {
    return <ModelsSettings onSave={onSave} saved={saved} />;
  }
  if (activeTab === "chunking") {
    return <ChunkingSettings onSave={onSave} saved={saved} />;
  }
  if (activeTab === "vector-store") {
    return <VectorStoreSettings onSave={onSave} saved={saved} />;
  }
  if (activeTab === "ingestion") {
    return <IngestionSettings onSave={onSave} saved={saved} />;
  }
  if (activeTab === "permissions") {
    return <PermissionsSettings onSave={onSave} saved={saved} />;
  }
  return <NotificationsSettings onSave={onSave} saved={saved} />;
}

type SectionSaveProps = {
  onSave: () => void;
  saved: boolean;
};

function ModelsSettings({ onSave, saved }: SectionSaveProps) {
  return (
    <SettingsSection
      title="Embedding Models"
      description="Configure which embedding model is used for generating chunk vectors."
      icon={Cpu}
      onSave={onSave}
      saved={saved}
    >
      <SettingRow
        label="Default Embedding Model"
        description="Used for all ingestions unless overridden per-dataset"
      >
        <Select defaultValue="3-large">
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3-large">
              text-embedding-3-large (3072d)
            </SelectItem>
            <SelectItem value="3-small">
              text-embedding-3-small (1536d)
            </SelectItem>
            <SelectItem value="ada-002">
              text-embedding-ada-002 (1536d)
            </SelectItem>
            <SelectItem value="custom">Custom model endpoint</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow
        label="Custom Model Endpoint"
        description="Optional: bring your own embedding API"
      >
        <Input placeholder="https://your-api.com/embeddings" className="w-72" />
      </SettingRow>
      <SettingRow
        label="Batch Size"
        description="Number of chunks to embed per API call"
      >
        <Select defaultValue="30">
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="30">30</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow
        label="Normalize embeddings"
        description="L2-normalize vectors before storing"
      >
        <Switch defaultChecked />
      </SettingRow>
    </SettingsSection>
  );
}

function ChunkingSettings({ onSave, saved }: SectionSaveProps) {
  return (
    <SettingsSection
      title="Chunking Defaults"
      description="Set the default chunking strategy applied to all ingestions."
      icon={Layers}
      onSave={onSave}
      saved={saved}
    >
      <SettingSlider
        label="Default Chunk Size (tokens)"
        description="Recommended: 256-1024"
        min={64}
        max={2048}
        defaultValue={512}
      />
      <SettingSlider
        label="Default Overlap (tokens)"
        description="Amount of token overlap between adjacent chunks"
        min={0}
        max={512}
        defaultValue={64}
      />
      <SettingRow
        label="Default Chunking Strategy"
        description="How to split documents into chunks"
      >
        <Select defaultValue="recursive">
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recursive">Recursive character</SelectItem>
            <SelectItem value="sentence">Sentence boundary</SelectItem>
            <SelectItem value="semantic">Semantic (slow)</SelectItem>
            <SelectItem value="fixed">Fixed token count</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow
        label="Run OCR by default"
        description="Apply OCR to image-heavy pages automatically"
      >
        <Switch defaultChecked />
      </SettingRow>
      <SettingRow
        label="Extract tables by default"
        description="Parse tabular content as separate table chunks"
      >
        <Switch defaultChecked />
      </SettingRow>
    </SettingsSection>
  );
}

function VectorStoreSettings({ onSave, saved }: SectionSaveProps) {
  return (
    <SettingsSection
      title="Vector Store Configuration"
      description="Configure the vector database where embeddings are indexed."
      icon={Box}
      onSave={onSave}
      saved={saved}
    >
      <SettingRow
        label="Vector Store Provider"
        description="Where to store and retrieve embeddings"
      >
        <Select defaultValue="pinecone">
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pinecone">Pinecone</SelectItem>
            <SelectItem value="qdrant">Qdrant</SelectItem>
            <SelectItem value="weaviate">Weaviate</SelectItem>
            <SelectItem value="chroma">Chroma</SelectItem>
            <SelectItem value="pgvector">pgvector (Postgres)</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow label="Index / Namespace" description="Target index in the vector store">
        <Input
          placeholder="prod-knowledge-base"
          className="w-64"
          defaultValue="prod-knowledge-base"
        />
      </SettingRow>
      <SettingRow
        label="API Key"
        description="Authentication for the vector store API"
      >
        <Input type="password" defaultValue="************" className="w-64" />
      </SettingRow>
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="size-2.5 flex-shrink-0 animate-pulse rounded-full bg-emerald-500" />
        <span className="flex-1 text-sm font-medium text-emerald-700">
          Connected to Pinecone - prod-knowledge-base
        </span>
        <Button
          size="sm"
          variant="outline"
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
        >
          Test Connection
        </Button>
      </div>
    </SettingsSection>
  );
}

function IngestionSettings({ onSave, saved }: SectionSaveProps) {
  return (
    <SettingsSection
      title="Ingestion Defaults"
      description="Configure default behavior for Auto and Guided mode ingestions."
      icon={RefreshCw}
      onSave={onSave}
      saved={saved}
    >
      <SettingRow
        label="Default Ingestion Mode"
        description="Mode selected by default on the New Ingestion page"
      >
        <Select defaultValue="auto">
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto Mode</SelectItem>
            <SelectItem value="guided">Guided Mode</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow
        label="Default Embedding Strategy"
        description="Embed representation used unless overridden"
      >
        <Select defaultValue="normalized">
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="raw">Raw</SelectItem>
            <SelectItem value="normalized">Normalized</SelectItem>
            <SelectItem value="summary">Summary</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow
        label="Auto-retry on failure"
        description="Automatically retry failed ingestion steps"
      >
        <Switch defaultChecked />
      </SettingRow>
      <SettingRow
        label="Retry Attempts"
        description="Max retries before marking as failed"
      >
        <Select defaultValue="3">
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="5">5</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </SettingsSection>
  );
}

function PermissionsSettings({ onSave, saved }: SectionSaveProps) {
  return (
    <SettingsSection
      title="Permission Defaults"
      description="Set default visibility and access control for new datasets and documents."
      icon={Shield}
      onSave={onSave}
      saved={saved}
    >
      <SettingRow
        label="Default Dataset Visibility"
        description="Applied when creating new datasets"
      >
        <Select defaultValue="team">
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="public">Public</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow
        label="Default Allowed Groups"
        description="Groups with read access to newly created datasets"
      >
        <Input defaultValue="engineering, data-team" className="w-72" />
      </SettingRow>
      <SettingRow
        label="Enable multi-tenant isolation"
        description="Enforce tenant_id filtering on all retrieval queries"
      >
        <Switch defaultChecked />
      </SettingRow>
      <SettingRow
        label="Require MFA for settings changes"
        description="Extra verification for sensitive operations"
      >
        <Switch />
      </SettingRow>
    </SettingsSection>
  );
}

function NotificationsSettings({ onSave, saved }: SectionSaveProps) {
  return (
    <SettingsSection
      title="Notifications"
      description="Configure when and how you receive ingestion alerts."
      icon={Bell}
      onSave={onSave}
      saved={saved}
    >
      <SettingRow
        label="Notify on completion"
        description="Send a notification when an ingestion completes"
      >
        <Switch defaultChecked />
      </SettingRow>
      <SettingRow
        label="Notify on failure"
        description="Send a notification when an ingestion fails"
      >
        <Switch defaultChecked />
      </SettingRow>
      <SettingRow
        label="Guided Mode approvals"
        description="Notify when a document is waiting for guided review"
      >
        <Switch defaultChecked />
      </SettingRow>
      <SettingRow
        label="Weekly digest"
        description="Summary of ingestion activity each Monday"
      >
        <Switch />
      </SettingRow>
      <SettingRow label="Notification Email" description="Where to send alerts">
        <Input defaultValue="alex.kim@acme.com" className="w-64" />
      </SettingRow>
    </SettingsSection>
  );
}
