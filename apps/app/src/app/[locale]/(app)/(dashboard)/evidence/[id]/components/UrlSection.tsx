"use client";

import { Badge } from "@bubba/ui/badge";
import { Button } from "@bubba/ui/button";
import { Input } from "@bubba/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@bubba/ui/tooltip";
import { Copy, ExternalLink, Link, Plus, Save, Trash } from "lucide-react";
import { useUrlManagement } from "../hooks/useUrlManagement";

interface UrlSectionProps {
  evidenceId: string;
  additionalUrls: string[];
  onSuccess: () => Promise<void>;
}

export function UrlSection({
  evidenceId,
  additionalUrls,
  onSuccess,
}: UrlSectionProps) {
  const {
    draftUrls,
    handleAddDraft,
    handleUpdateDraft,
    handleRemoveDraft,
    handleSaveUrls,
    handleUrlRemove,
  } = useUrlManagement({
    evidenceId,
    currentUrls: additionalUrls,
    onSuccess,
  });

  // Function to get domain name from URL for display
  const getDomainName = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace(/^www\./, "");
    } catch (e) {
      return url;
    }
  };

  // Copy URL to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Additional Links</h3>
          {draftUrls.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs flex items-center gap-1 py-0"
              onClick={handleAddDraft}
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {additionalUrls.length} link{additionalUrls.length !== 1 ? "s" : ""}{" "}
          added
        </span>
      </div>

      {/* Draft URL Input Section */}
      {draftUrls.length > 0 && (
        <div className="space-y-3">
          {draftUrls.map((draft) => (
            <div
              key={draft.id}
              className="flex items-center gap-2 rounded-md border bg-card p-3"
            >
              <Input
                type="url"
                placeholder="Enter URL"
                value={draft.url}
                onChange={(e) => handleUpdateDraft(draft.id, e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.url.trim()) {
                    e.preventDefault();
                    handleSaveUrls();
                  }
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemoveDraft(draft.id)}
                className="h-9 w-9 hover:text-destructive"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleAddDraft}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Link
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={handleSaveUrls}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Links
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col space-y-2">
        {/* URL List */}
        {additionalUrls.length > 0 && (
          <div className="grid gap-2">
            {additionalUrls.map((url) => {
              const domain = getDomainName(url);

              return (
                <div
                  key={url}
                  className="group flex items-center gap-3 p-3 rounded-md border bg-card hover:bg-accent/10 transition-colors"
                >
                  <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                    <Link className="h-5 w-5 text-primary" />
                  </div>

                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">{domain}</h4>
                      <Badge
                        variant="outline"
                        className="hidden sm:flex text-xs"
                      >
                        URL
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {url}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full"
                            onClick={() => copyToClipboard(url)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy link</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            asChild
                            className="h-8 w-8 rounded-full"
                          >
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Open link</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full hover:text-destructive"
                            onClick={() => handleUrlRemove(url)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete link</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
