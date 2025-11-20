"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Copy, Edit, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@trycompai/ui/badge";
import { Button } from "@trycompai/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@trycompai/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@trycompai/ui/tooltip";

import { AddSecretDialog } from "../AddSecretDialog";
import { EditSecretDialog } from "../EditSecretDialog";

interface Secret {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

interface SecretsTableProps {
  secrets: Secret[];
}

export function SecretsTable({ secrets }: SecretsTableProps) {
  const [revealedSecrets, setRevealedSecrets] = useState<
    Record<string, string>
  >({});
  const [loadingSecrets, setLoadingSecrets] = useState<Record<string, boolean>>(
    {},
  );
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);

  const handleRevealSecret = async (secretId: string) => {
    if (revealedSecrets[secretId]) {
      // Hide the secret
      setRevealedSecrets((prev) => {
        const next = { ...prev };
        delete next[secretId];
        return next;
      });
      return;
    }

    // Reveal the secret
    setLoadingSecrets((prev) => ({ ...prev, [secretId]: true }));

    try {
      // Get organizationId from the URL path
      const pathSegments = window.location.pathname.split("/");
      const orgId = pathSegments[1]; // Assuming path is /{orgId}/settings/secrets

      const response = await fetch(
        `/api/secrets/${secretId}?organizationId=${orgId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch secret");
      }

      const data = await response.json();
      setRevealedSecrets((prev) => ({
        ...prev,
        [secretId]: data.secret.value,
      }));
    } catch (error) {
      toast.error("Failed to reveal secret");
      console.error("Error revealing secret:", error);
    } finally {
      setLoadingSecrets((prev) => ({ ...prev, [secretId]: false }));
    }
  };

  const handleDeleteSecret = async (secretId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this secret? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      // Get organizationId from the URL path
      const pathSegments = window.location.pathname.split("/");
      const orgId = pathSegments[1]; // Assuming path is /{orgId}/settings/secrets

      const response = await fetch(
        `/api/secrets/${secretId}?organizationId=${orgId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete secret");
      }

      toast.success("Secret deleted successfully");
      // Reload the page to refresh the list
      window.location.reload();
    } catch (error) {
      toast.error("Failed to delete secret");
      console.error("Error deleting secret:", error);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Organization Secrets</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Secure storage for API keys and credentials used by AI automations
          </p>
        </div>
        <AddSecretDialog />
      </div>

      {/* Table */}
      <div className="border-border/50 bg-card/50 overflow-hidden rounded-md border shadow-sm backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 border-b hover:bg-transparent">
              <TableHead className="text-muted-foreground pl-6 text-xs font-medium tracking-wider uppercase">
                Name
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Value
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Category
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Description
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Last Used
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Created
              </TableHead>
              <TableHead className="text-muted-foreground pr-6 text-right text-xs font-medium tracking-wider uppercase">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {secrets.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-muted/50 flex h-12 w-12 items-center justify-center rounded-full">
                      <Eye className="text-muted-foreground h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">No secrets yet</p>
                      <p className="text-muted-foreground text-xs">
                        Create your first secret to enable AI automations
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              secrets.map((secret) => (
                <TableRow
                  key={secret.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="pl-6 font-mono text-sm font-medium">
                    {secret.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {loadingSecrets[secret.id] ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-muted-foreground text-sm">
                            Loading...
                          </span>
                        </div>
                      ) : revealedSecrets[secret.id] ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    revealedSecrets[secret.id],
                                  );
                                  toast.success("Secret copied to clipboard");
                                }}
                                className="bg-primary/10 hover:bg-primary/20 group border-primary/20 inline-flex max-w-[240px] items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-sm transition-all"
                              >
                                <span className="text-primary truncate">
                                  {revealedSecrets[secret.id]}
                                </span>
                                <Copy className="text-primary h-3 w-3 flex-shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Click to copy</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground/70 font-mono text-sm">
                          ••••••••••••
                        </span>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-primary/10 h-8 w-8"
                              onClick={() => handleRevealSecret(secret.id)}
                              disabled={loadingSecrets[secret.id]}
                            >
                              {revealedSecrets[secret.id] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {revealedSecrets[secret.id] ? "Hide" : "Reveal"}{" "}
                              secret
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell>
                    {secret.category ? (
                      <Badge
                        variant="outline"
                        className="border-border/50 bg-muted/30 text-xs font-normal"
                      >
                        {secret.category.replace("_", " ")}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/50 text-sm">
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {secret.description ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground block max-w-xs cursor-help truncate text-sm">
                              {secret.description}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md">
                            <p className="text-sm whitespace-pre-wrap">
                              {secret.description}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">
                      {secret.lastUsedAt
                        ? format(new Date(secret.lastUsedAt), "MMM d, yyyy")
                        : "Never"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">
                      {format(new Date(secret.createdAt), "MMM d, yyyy")}
                    </span>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground/50 hover:text-primary hover:bg-primary/10 h-8 w-8 transition-all"
                              onClick={() => setEditingSecret(secret)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit secret</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 h-8 w-8 transition-all"
                              onClick={() => handleDeleteSecret(secret.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete secret</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Secret Dialog */}
      {editingSecret && (
        <EditSecretDialog
          secret={editingSecret}
          open={!!editingSecret}
          onOpenChange={(open) => !open && setEditingSecret(null)}
          onSecretUpdated={() => window.location.reload()}
        />
      )}
    </div>
  );
}
