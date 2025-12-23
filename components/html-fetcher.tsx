"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Globe,
  Download,
  Copy,
  Check,
  Loader2,
  Code2,
  FileText,
  Sparkles,
  AlertCircle,
  Type,
  List,
  Sun,
  Moon,
  Plus,
  Trash2,
} from "lucide-react";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import { useTheme } from "@/components/theme-provider";

type ViewMode = "beautified" | "raw" | "text" | "structured";

interface FetchResult {
  html: string;
  rawHtml: string;
  textOnly: string;
  structuredText: string;
  url: string;
  contentLength: number;
  beautifiedLength: number;
  textLength: number;
}

interface HtmlFetcherSectionProps {
  id: string;
  index: number;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

function HtmlFetcherSection({ id, index, onRemove, canRemove }: HtmlFetcherSectionProps) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<FetchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("beautified");
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (result && codeRef.current && (viewMode === "beautified" || viewMode === "raw")) {
      Prism.highlightElement(codeRef.current);
    }
  }, [result, viewMode]);

  const fetchHtml = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/fetch-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch HTML");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getDisplayContent = () => {
    if (!result) return "";
    switch (viewMode) {
      case "beautified":
        return result.html;
      case "raw":
        return result.rawHtml;
      case "text":
        return result.textOnly;
      case "structured":
        return result.structuredText;
    }
  };

  const getContentLength = () => {
    if (!result) return 0;
    switch (viewMode) {
      case "beautified":
        return result.beautifiedLength;
      case "raw":
        return result.contentLength;
      case "text":
      case "structured":
        return result.textLength;
    }
  };

  const copyToClipboard = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(getDisplayContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    if (!result) return;

    const content = getDisplayContent();
    const isText = viewMode === "text" || viewMode === "structured";
    const mimeType = isText ? "text/plain" : "text/html";
    const extension = isText ? ".txt" : ".html";

    const blob = new Blob([content], { type: mimeType });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;

    try {
      const urlObj = new URL(result.url);
      const filename = urlObj.hostname.replace(/\./g, "_") + extension;
      link.download = filename;
    } catch {
      link.download = "downloaded" + extension;
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      fetchHtml();
    }
  };

  const isHtmlMode = viewMode === "beautified" || viewMode === "raw";

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-muted-foreground">
          Fetcher #{index + 1}
        </h2>
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Remove
          </Button>
        )}
      </div>

      {/* Input Section */}
      <CardContent className="">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="url"
              placeholder="Enter URL (e.g., https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 h-12"
              disabled={loading}
            />
          </div>
          <Button
            onClick={fetchHtml}
            disabled={loading}
            className="h-12 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Fetch HTML
              </>
            )}
          </Button>
        </div>
      </CardContent>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result Section */}
      {result && (
        <Card className="border-primary/20">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Result
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {getContentLength().toLocaleString()} characters
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Copy Button */}
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>

                  {/* Download Button */}
                  <Button variant="outline" size="sm" onClick={downloadFile}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              {/* View Mode Tabs */}
              <div className="flex flex-wrap gap-2 p-1 bg-muted rounded-lg">
                <Button
                  variant={viewMode === "text" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("text")}
                  className="flex-1 sm:flex-none"
                >
                  <Type className="w-4 h-4 mr-2" />
                  Text Only
                </Button>
                <Button
                  variant={viewMode === "beautified" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("beautified")}
                  className="flex-1 sm:flex-none"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Beautified
                </Button>
                <Button
                  variant={viewMode === "raw" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("raw")}
                  className="flex-1 sm:flex-none"
                >
                  <Code2 className="w-4 h-4 mr-2" />
                  Raw HTML
                </Button>
                <Button
                  variant={viewMode === "structured" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("structured")}
                  className="flex-1 sm:flex-none"
                >
                  <List className="w-4 h-4 mr-2" />
                  Structured
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {isHtmlMode ? (
                <pre className="overflow-auto max-h-[600px] p-4 rounded-lg bg-slate-950 text-sm">
                  <code
                    ref={codeRef}
                    className="language-markup"
                    key={viewMode}
                  >
                    {getDisplayContent()}
                  </code>
                </pre>
              ) : (
                <div className="overflow-auto max-h-[600px] p-4 rounded-lg bg-slate-950 text-sm">
                  <pre className="whitespace-pre-wrap text-slate-200 font-mono leading-relaxed">
                    {getDisplayContent()}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Main container component that manages multiple fetchers
export function HtmlFetcher() {
  const [fetchers, setFetchers] = useState<string[]>([crypto.randomUUID()]);
  const { theme, toggleTheme } = useTheme();

  const addFetcher = () => {
    setFetchers((prev) => [...prev, crypto.randomUUID()]);
  };

  const removeFetcher = (id: string) => {
    setFetchers((prev) => prev.filter((fetcherId) => fetcherId !== id));
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 relative">
        {/* Theme Toggle Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="absolute right-0 top-0"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>

        <div className="flex items-center justify-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            <Code2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">HTML Fetcher</h1>
        </div>
        <p className="text-muted-foreground">
          Fetch, beautify, extract text, and download HTML from any URL
        </p>
      </div>

      {/* Fetcher Sections */}
      <div className="space-y-8">
        {fetchers.map((id, index) => (
          <div
            key={id}
            className="p-6 rounded-xl border bg-card/50 backdrop-blur-sm"
          >
            <HtmlFetcherSection
              id={id}
              index={index}
              onRemove={removeFetcher}
              canRemove={fetchers.length > 1}
            />
          </div>
        ))}
      </div>

      {/* Add Fetcher Button */}
      <div className="flex justify-center">
        <Button
          onClick={addFetcher}
          variant="outline"
          size="lg"
          className="gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5"
        >
          <Plus className="w-5 h-5" />
          Add Another Fetcher
        </Button>
      </div>
    </div>
  );
}
