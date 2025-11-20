"use client";

import type { JSONContent } from "@tiptap/react";
import { useState } from "react";
import { regeneratePolicyAction } from "@/app/(app)/[orgId]/policies/[policyId]/actions/regenerate-policy";
import { generatePolicyPDF } from "@/lib/pdf-generator";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import type { Member, Policy, User } from "@trycompai/db";
import { Button } from "@trycompai/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@trycompai/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@trycompai/ui/dropdown-menu";
import { Icons } from "@trycompai/ui/icons";

import { AuditLogWithRelations } from "../data";

export function PolicyHeaderActions({
  policy,
  logs,
}: {
  policy: (Policy & { approver: (Member & { user: User }) | null }) | null;
  logs: AuditLogWithRelations[];
}) {
  const [isRegenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  // Delete flows through query param to existing dialog in PolicyOverview
  const regenerate = useAction(regeneratePolicyAction, {
    onSuccess: () =>
      toast.success("Regeneration triggered. This may take a moment."),
    onError: () => toast.error("Failed to trigger policy regeneration"),
  });

  const handleDownloadPDF = () => {
    try {
      if (!policy || !policy.content) {
        toast.error("Policy content not available for download");
        return;
      }

      // Convert policy content to JSONContent array if needed
      let policyContent: JSONContent[];
      if (Array.isArray(policy.content)) {
        policyContent = policy.content as JSONContent[];
      } else if (
        typeof policy.content === "object" &&
        policy.content !== null
      ) {
        policyContent = [policy.content as JSONContent];
      } else {
        toast.error("Invalid policy content format");
        return;
      }

      // Generate and download the PDF
      generatePolicyPDF(
        policyContent as any,
        logs,
        policy.name || "Policy Document",
      );
    } catch (error) {
      console.error("Error downloading policy PDF:", error);
      toast.error("Failed to generate policy PDF");
    }
  };

  if (!policy) return null;

  const isPendingApproval = !!policy.approverId;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="m-0 size-auto p-2">
            <Icons.Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setRegenerateConfirmOpen(true)}
            disabled={isPendingApproval}
          >
            <Icons.AI className="mr-2 h-4 w-4" /> Regenerate policy
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("policy-overview-sheet", "true");
              window.history.pushState({}, "", url.toString());
            }}
          >
            <Icons.Edit className="mr-2 h-4 w-4" /> Edit policy
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleDownloadPDF()}>
            <Icons.Download className="mr-2 h-4 w-4" /> Download as PDF
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("archive-policy-sheet", "true");
              window.history.pushState({}, "", url.toString());
            }}
          >
            <Icons.InboxCustomize className="mr-2 h-4 w-4" /> Archive / Restore
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("delete-policy", "true");
              window.history.pushState({}, "", url.toString());
            }}
            className="text-destructive"
          >
            <Icons.Delete className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Regenerate Confirmation Dialog */}
      <Dialog
        open={isRegenerateConfirmOpen}
        onOpenChange={setRegenerateConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Policy</DialogTitle>
            <DialogDescription>
              This will generate new policy content using your org context and
              frameworks and mark it for review. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRegenerateConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                regenerate.execute({ policyId: policy.id });
                setRegenerateConfirmOpen(false);
              }}
              disabled={regenerate.status === "executing"}
            >
              {regenerate.status === "executing" ? "Working…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
