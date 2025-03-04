"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bubba/ui/select";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { updateEvidenceFrequency } from "../actions/updateEvidenceFrequency";
import type { Frequency } from "@bubba/db";

interface FrequencySectionProps {
  evidenceId: string;
  currentFrequency: Frequency | null;
  onSuccess: () => Promise<void>;
}

export function FrequencySection({
  evidenceId,
  currentFrequency,
  onSuccess,
}: FrequencySectionProps) {
  const [frequency, setFrequency] = useState<Frequency | null>(
    currentFrequency || null
  );

  const { execute: updateFrequency, isExecuting } = useAction(
    updateEvidenceFrequency,
    {
      onSuccess: async () => {
        toast.success("Review frequency updated successfully");
        await onSuccess();
      },
      onError: () => {
        toast.error("Failed to update review frequency");
      },
    }
  );

  useEffect(() => {
    setFrequency(currentFrequency || null);
  }, [currentFrequency]);

  const handleFrequencyChange = (value: string) => {
    const newFrequency = value === "none" ? null : (value as Frequency);
    setFrequency(newFrequency);
    updateFrequency({ id: evidenceId, frequency: newFrequency });
  };

  const frequencyOptions = [
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
  ];

  return (
    <Select
      value={frequency || "none"}
      onValueChange={handleFrequencyChange}
      disabled={isExecuting}
    >
      <SelectTrigger className="w-full h-9 text-sm">
        <SelectValue placeholder="Select frequency" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {frequencyOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
