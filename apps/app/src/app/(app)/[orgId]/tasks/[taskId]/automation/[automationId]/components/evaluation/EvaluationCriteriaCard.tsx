'use client';

import { Button } from '@comp/ui/button';
import { Textarea } from '@comp/ui/textarea';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { updateEvaluationCriteria } from '../../actions/task-automation-actions';

interface EvaluationCriteriaCardProps {
  automationId: string;
  initialCriteria?: string;
  isAiGenerated?: boolean;
}

export function EvaluationCriteriaCard({
  automationId,
  initialCriteria,
}: EvaluationCriteriaCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [criteria, setCriteria] = useState(initialCriteria || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateEvaluationCriteria(automationId, criteria);
      if (result.success) {
        toast.success('Success criteria updated');
        setIsEditing(false);
      } else {
        toast.error(result.error || 'Failed to update criteria');
      }
    } catch (error) {
      toast.error('Failed to update criteria');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setCriteria(initialCriteria || '');
    setIsEditing(false);
  };

  // Format inline code with chips
  const formatCriteriaText = (text: string) => {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        const code = part.slice(1, -1);
        return (
          <code
            key={index}
            className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-md bg-primary/10 text-[13px] font-mono text-foreground border border-primary/20"
          >
            {code}
          </code>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Parse pass/fail conditions
  const parseConditions = (text: string) => {
    const lowerText = text.toLowerCase();
    const hasPassCondition = lowerText.includes('pass') && lowerText.includes('if');
    const hasFailCondition = lowerText.includes('fail') && lowerText.includes('if');

    if (hasPassCondition || hasFailCondition) {
      return { formatted: formatCriteriaText(text), hasStructure: true };
    }
    return { formatted: formatCriteriaText(text), hasStructure: false };
  };

  const { formatted, hasStructure } = criteria
    ? parseConditions(criteria)
    : { formatted: null, hasStructure: false };

  return (
    <div className="relative group">
      {/* Main Card with subtle tint */}
      <div className="rounded-xl bg-primary/5 border border-primary/10 p-5 transition-all hover:border-primary/20 hover:bg-primary/[0.07]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Success Criteria</h3>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Edit criteria
            </button>
          )}
        </div>

        {/* Body */}
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder="Define when this automation passes or fails, e.g., 'dependabot is enabled'"
              className="leading-relaxed text-sm bg-background"
              rows={4}
              disabled={isSaving}
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-8"
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {criteria ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <p className="text-sm leading-relaxed text-foreground flex-1">{formatted}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No success criteria defined yet. Click{' '}
                <span className="text-primary font-medium">Edit criteria</span> to add one.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
