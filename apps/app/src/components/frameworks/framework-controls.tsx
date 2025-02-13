"use client";

import type { TransformedCategory } from "@/types/framework";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@bubba/ui/card";

import { DataTable } from "@/components/tables/frameworks/data-table";

interface FrameworkControlsProps {
  categories: TransformedCategory[];
  frameworkId: string;
}

export function FrameworkControls({
  categories,
  frameworkId,
}: FrameworkControlsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Controls</CardTitle>
        <CardDescription>Review and manage compliance controls</CardDescription>
      </CardHeader>
      <CardContent>
        {categories.map((category) => (
          <div key={category.id} className="mb-8">
            <h3 className="text-lg font-semibold mb-4">{category.name}</h3>
            <DataTable
              data={category.controls.map((control) => ({
                ...control,
                frameworkId,
                categoryId: category.id,
                requiredArtifactTypes: [],
              }))}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
