import { useState } from "react";
import Topbar from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Cpu, Box, Layers, Shield, Bell, RefreshCw, Save,
  CheckCircle2, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SETTING_TABS = [
  { id: "models", label: "Embedding Models", icon: Cpu, desc: "Model & endpoint config" },
  { id: "chunking", label: "Chunking", icon: Layers, desc: "Chunk size & strategy" },
  { id: "vector-store", label: "Vector Store", icon: Box, desc: "Database connection" },
  { id: "ingestion", label: "Ingestion Defaults", icon: RefreshCw, desc: "Mode & retry settings" },
  { id: "permissions", label: "Permissions", icon: Shield, desc: "Access control" },
  { id: "notifications", label: "Notifications", icon: Bell, desc: "Alerts & emails" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("models");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col flex-1 overflow-auto bg-gray-50/40">
      <Topbar title="Settings" />

      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto w-full px-8 py-7">
        <div className="flex gap-5">
          {/* Sidebar nav */}
          <div className="w-56 flex-shrink-0 space-y-1">
            {SETTING_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group",
                  activeTab === tab.id
                    ? "bg-white border border-gray-100 shadow-sm text-indigo-700"
                    : "text-gray-600 hover:bg-white hover:text-gray-900"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                  activeTab === tab.id ? "bg-indigo-50" : "bg-gray-100 group-hover:bg-gray-200"
                )}>
                  <tab.icon className={cn("size-3.5", activeTab === tab.id ? "text-indigo-600" : "text-gray-500")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tab.label}</p>
                  <p className="text-xs text-gray-400 truncate">{tab.desc}</p>
                </div>
                {activeTab === tab.id && (
                  <ChevronRight className="size-3.5 text-indigo-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTab === "models" && (
              <SettingsSection
                title="Embedding Models"
                description="Configure which embedding model is used for generating chunk vectors."
                icon={Cpu}
                onSave={handleSave}
                saved={saved}
              >
                <SettingRow label="Default Embedding Model" description="Used for all ingestions unless overridden per-dataset">
                  <Select defaultValue="3-large">
                    <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3-large">text-embedding-3-large (3072d)</SelectItem>
                      <SelectItem value="3-small">text-embedding-3-small (1536d)</SelectItem>
                      <SelectItem value="ada-002">text-embedding-ada-002 (1536d)</SelectItem>
                      <SelectItem value="custom">Custom model endpoint</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow label="Custom Model Endpoint" description="Optional: bring your own embedding API">
                  <Input placeholder="https://your-api.com/embeddings" className="w-72" />
                </SettingRow>
                <SettingRow label="Batch Size" description="Number of chunks to embed per API call">
                  <Select defaultValue="30">
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow label="Normalize embeddings" description="L2-normalize vectors before storing">
                  <Switch defaultChecked />
                </SettingRow>
              </SettingsSection>
            )}

            {activeTab === "chunking" && (
              <SettingsSection title="Chunking Defaults" description="Set the default chunking strategy applied to all ingestions." icon={Layers} onSave={handleSave} saved={saved}>
                <SettingSlider label="Default Chunk Size (tokens)" description="Recommended: 256–1024" min={64} max={2048} defaultValue={512} />
                <SettingSlider label="Default Overlap (tokens)" description="Amount of token overlap between adjacent chunks" min={0} max={512} defaultValue={64} />
                <SettingRow label="Default Chunking Strategy" description="How to split documents into chunks">
                  <Select defaultValue="recursive">
                    <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recursive">Recursive character</SelectItem>
                      <SelectItem value="sentence">Sentence boundary</SelectItem>
                      <SelectItem value="semantic">Semantic (slow)</SelectItem>
                      <SelectItem value="fixed">Fixed token count</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow label="Run OCR by default" description="Apply OCR to image-heavy pages automatically">
                  <Switch defaultChecked />
                </SettingRow>
                <SettingRow label="Extract tables by default" description="Parse tabular content as separate table chunks">
                  <Switch defaultChecked />
                </SettingRow>
              </SettingsSection>
            )}

            {activeTab === "vector-store" && (
              <SettingsSection title="Vector Store Configuration" description="Configure the vector database where embeddings are indexed." icon={Box} onSave={handleSave} saved={saved}>
                <SettingRow label="Vector Store Provider" description="Where to store and retrieve embeddings">
                  <Select defaultValue="pinecone">
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
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
                  <Input placeholder="prod-knowledge-base" className="w-64" defaultValue="prod-knowledge-base" />
                </SettingRow>
                <SettingRow label="API Key" description="Authentication for the vector store API">
                  <Input type="password" defaultValue="••••••••••••••••" className="w-64" />
                </SettingRow>
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                  <span className="text-sm text-emerald-700 font-medium flex-1">Connected to Pinecone — prod-knowledge-base</span>
                  <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">Test Connection</Button>
                </div>
              </SettingsSection>
            )}

            {activeTab === "ingestion" && (
              <SettingsSection title="Ingestion Defaults" description="Configure default behavior for Auto and Guided mode ingestions." icon={RefreshCw} onSave={handleSave} saved={saved}>
                <SettingRow label="Default Ingestion Mode" description="Mode selected by default on the New Ingestion page">
                  <Select defaultValue="auto">
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto Mode</SelectItem>
                      <SelectItem value="guided">Guided Mode</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow label="Default Embedding Strategy" description="Embed representation used unless overridden">
                  <Select defaultValue="normalized">
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw">Raw</SelectItem>
                      <SelectItem value="normalized">Normalized</SelectItem>
                      <SelectItem value="summary">Summary</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow label="Auto-retry on failure" description="Automatically retry failed ingestion steps">
                  <Switch defaultChecked />
                </SettingRow>
                <SettingRow label="Retry Attempts" description="Max retries before marking as failed">
                  <Select defaultValue="3">
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
              </SettingsSection>
            )}

            {activeTab === "permissions" && (
              <SettingsSection title="Permission Defaults" description="Set default visibility and access control for new datasets and documents." icon={Shield} onSave={handleSave} saved={saved}>
                <SettingRow label="Default Dataset Visibility" description="Applied when creating new datasets">
                  <Select defaultValue="team">
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow label="Default Allowed Groups" description="Groups with read access to newly created datasets">
                  <Input defaultValue="engineering, data-team" className="w-72" />
                </SettingRow>
                <SettingRow label="Enable multi-tenant isolation" description="Enforce tenant_id filtering on all retrieval queries">
                  <Switch defaultChecked />
                </SettingRow>
                <SettingRow label="Require MFA for settings changes" description="Extra verification for sensitive operations">
                  <Switch />
                </SettingRow>
              </SettingsSection>
            )}

            {activeTab === "notifications" && (
              <SettingsSection title="Notifications" description="Configure when and how you receive ingestion alerts." icon={Bell} onSave={handleSave} saved={saved}>
                <SettingRow label="Notify on completion" description="Send a notification when an ingestion completes">
                  <Switch defaultChecked />
                </SettingRow>
                <SettingRow label="Notify on failure" description="Send a notification when an ingestion fails">
                  <Switch defaultChecked />
                </SettingRow>
                <SettingRow label="Guided Mode approvals" description="Notify when a document is waiting for guided review">
                  <Switch defaultChecked />
                </SettingRow>
                <SettingRow label="Weekly digest" description="Summary of ingestion activity each Monday">
                  <Switch />
                </SettingRow>
                <SettingRow label="Notification Email" description="Where to send alerts">
                  <Input defaultValue="alex.kim@acme.com" className="w-64" />
                </SettingRow>
              </SettingsSection>
            )}
          </div>
        </div>
              </div>
      </main>
    </div>
  );
}

function SettingsSection({
  title, description, icon: Icon, children, onSave, saved
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onSave: () => void;
  saved: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-50 bg-gray-50/40">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Icon className="size-4 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>

      <div className="px-6 py-4 divide-y divide-gray-50 space-y-0">
        {children}
      </div>

      <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
        <p className="text-xs text-gray-400">Changes are applied to new ingestions only</p>
        <Button
          size="sm"
          className={cn(
            "gap-2 min-w-32 transition-all",
            saved ? "bg-emerald-600 hover:bg-emerald-600" : ""
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

function SettingRow({
  label, description, children
}: {
  label: string; description: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function SettingSlider({
  label, description, min, max, defaultValue
}: {
  label: string; description: string; min: number; max: number; defaultValue: number
}) {
  const [value, setValue] = useState([defaultValue]);
  return (
    <div className="flex items-center justify-between gap-6 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-3 w-60 flex-shrink-0">
        <Slider value={value} onValueChange={setValue} min={min} max={max} step={32} className="flex-1" />
        <span className="text-sm font-semibold text-indigo-700 w-14 text-right tabular-nums">{value[0]}</span>
      </div>
    </div>
  );
}
