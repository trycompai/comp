"use client";

import { useState } from "react";
import { Edit2, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@trycompai/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@trycompai/ui/dialog";
import { Input } from "@trycompai/ui/input";
import { Label } from "@trycompai/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@trycompai/ui/tabs";

import { disconnectCloudAction } from "../actions/disconnect-cloud";
import { updateCloudCredentialsAction } from "../actions/update-cloud-credentials";

interface CloudProvider {
  id: "aws" | "gcp" | "azure";
  name: string;
  fields: {
    id: string;
    label: string;
  }[];
}

interface CloudSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectedProviders: CloudProvider[];
  onUpdate: () => void;
}

export function CloudSettingsModal({
  open,
  onOpenChange,
  connectedProviders,
  onUpdate,
}: CloudSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<string>(
    connectedProviders[0]?.id || "aws",
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [credentials, setCredentials] = useState<
    Record<string, Record<string, string>>
  >({});
  const [editingFields, setEditingFields] = useState<
    Record<string, Set<string>>
  >({});

  const handleUpdateCredentials = async (
    providerId: "aws" | "gcp" | "azure",
  ) => {
    const providerCredentials = credentials[providerId] || {};

    // Filter out empty values
    const filledCredentials = Object.entries(providerCredentials)
      .filter(([_, value]) => value.trim() !== "")
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    if (Object.keys(filledCredentials).length === 0) {
      toast.error("Please fill in at least one field to update");
      return;
    }

    try {
      setIsUpdating(true);
      const result = await updateCloudCredentialsAction({
        cloudProvider: providerId,
        credentials: filledCredentials,
      });

      if (result?.data?.success) {
        toast.success("Credentials updated successfully");
        setCredentials({});
        setEditingFields({});
        onUpdate();
        onOpenChange(false);
      } else {
        toast.error(result?.data?.error || "Failed to update credentials");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDisconnect = async (providerId: "aws" | "gcp" | "azure") => {
    if (
      !confirm(
        "Are you sure you want to disconnect this cloud provider? All scan results will be deleted.",
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      const result = await disconnectCloudAction({
        cloudProvider: providerId,
      });

      if (result?.data?.success) {
        toast.success("Cloud provider disconnected");
        onUpdate();
        onOpenChange(false);
      } else {
        toast.error(result?.data?.error || "Failed to disconnect");
      }
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleFieldEditing = (providerId: string, fieldId: string) => {
    setEditingFields((prev) => {
      const providerFields = new Set(prev[providerId] || []);
      if (providerFields.has(fieldId)) {
        providerFields.delete(fieldId);
      } else {
        providerFields.add(fieldId);
      }
      return {
        ...prev,
        [providerId]: providerFields,
      };
    });
  };

  const handleFieldChange = (
    providerId: string,
    fieldId: string,
    value: string,
  ) => {
    setCredentials((prev) => ({
      ...prev,
      [providerId]: {
        ...(prev[providerId] || {}),
        [fieldId]: value,
      },
    }));
  };

  const isFieldEditing = (providerId: string, fieldId: string) => {
    return editingFields[providerId]?.has(fieldId) || false;
  };

  const hasChanges = (providerId: string) => {
    const providerCreds = credentials[providerId] || {};
    return Object.values(providerCreds).some((val) => val.trim() !== "");
  };

  if (connectedProviders.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Cloud Connections</DialogTitle>
          <DialogDescription>
            Update credentials or disconnect cloud providers
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList
            className="grid w-full"
            style={{
              gridTemplateColumns: `repeat(${connectedProviders.length}, 1fr)`,
            }}
          >
            {connectedProviders.map((provider) => (
              <TabsTrigger key={provider.id} value={provider.id}>
                {provider.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {connectedProviders.map((provider) => (
            <TabsContent
              key={provider.id}
              value={provider.id}
              className="space-y-4"
            >
              <div className="bg-muted/50 rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">
                  Credentials are securely stored. Click the edit icon to change
                  a specific field.
                </p>
              </div>

              <div className="space-y-4">
                {provider.fields.map((field) => {
                  const isEditing = isFieldEditing(provider.id, field.id);
                  return (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={`${provider.id}-${field.id}`}>
                        {field.label}
                      </Label>
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <Input
                              id={`${provider.id}-${field.id}`}
                              type="password"
                              placeholder={`Enter new ${field.label.toLowerCase()}`}
                              value={credentials[provider.id]?.[field.id] || ""}
                              onChange={(e) =>
                                handleFieldChange(
                                  provider.id,
                                  field.id,
                                  e.target.value,
                                )
                              }
                              disabled={isUpdating || isDeleting}
                              className="flex-1"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                toggleFieldEditing(provider.id, field.id);
                                // Clear the value when canceling
                                handleFieldChange(provider.id, field.id, "");
                              }}
                              disabled={isUpdating || isDeleting}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Input
                              id={`${provider.id}-${field.id}`}
                              type="password"
                              value="••••••••••••••••"
                              disabled
                              className="flex-1"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                toggleFieldEditing(provider.id, field.id)
                              }
                              disabled={isUpdating || isDeleting}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <DialogFooter className="flex justify-between sm:justify-between">
                <Button
                  variant="destructive"
                  onClick={() => handleDisconnect(provider.id)}
                  disabled={isUpdating || isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Disconnect
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleUpdateCredentials(provider.id)}
                  disabled={
                    isUpdating || isDeleting || !hasChanges(provider.id)
                  }
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
