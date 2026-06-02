import { useEffect, useMemo, useState } from 'react';
import type { IsmsDocumentTemplate, MappedControl, MappedRequirement } from './types';

export interface IsmsDocumentRow {
  id: string;
  name: string;
  documentType: string;
  clause: string | null;
  requirements: MappedRequirement[];
  requirementCount: number;
  controls: MappedControl[];
  controlCount: number;
}

interface UseIsmsDocumentRowsParams {
  templates: IsmsDocumentTemplate[];
  frameworkId: string;
}

interface UseIsmsDocumentRowsResult {
  data: IsmsDocumentRow[];
  handleRequirementLinked: (templateId: string, requirement: MappedRequirement) => void;
  handleRequirementUnlinked: (templateId: string, requirementId: string) => void;
  handleControlLinked: (templateId: string, control: MappedControl) => void;
  handleControlUnlinked: (templateId: string, controlTemplateId: string) => void;
}

/** Holds the optimistic template state and derives table rows for the ISMS documents grid. */
export function useIsmsDocumentRows({
  templates,
  frameworkId,
}: UseIsmsDocumentRowsParams): UseIsmsDocumentRowsResult {
  const [templatesState, setTemplatesState] = useState(templates);

  // Re-sync optimistic local state whenever the server-provided templates change
  // (e.g. after the parent refetches following a link/unlink save), so fresh data
  // isn't silently dropped.
  useEffect(() => {
    setTemplatesState(templates);
  }, [templates]);

  const data: IsmsDocumentRow[] = useMemo(
    () =>
      templatesState.map((template) => {
        const requirements = template.requirementLinks.map((link) => ({
          id: link.requirement.id,
          name: link.requirement.identifier
            ? `${link.requirement.identifier} - ${link.requirement.name}`
            : link.requirement.name,
        }));
        const controls = template.controlLinks.map((link) => ({
          id: link.controlTemplate.id,
          name: link.controlTemplate.name,
        }));
        return {
          id: template.id,
          name: template.name,
          documentType: template.documentType,
          clause: template.clause,
          requirements,
          requirementCount: requirements.length,
          controls,
          controlCount: controls.length,
        };
      }),
    [templatesState],
  );

  const handleRequirementLinked = (
    templateId: string,
    requirement: MappedRequirement,
  ) => {
    setTemplatesState((prev) =>
      prev.map((template) =>
        template.id === templateId
          ? {
              ...template,
              requirementLinks: [
                ...template.requirementLinks,
                {
                  id: `local_${requirement.id}`,
                  frameworkId,
                  requirementId: requirement.id,
                  requirement: {
                    id: requirement.id,
                    name: requirement.name,
                    identifier: '',
                    framework: { id: frameworkId, name: '' },
                  },
                },
              ],
            }
          : template,
      ),
    );
  };

  const handleRequirementUnlinked = (templateId: string, requirementId: string) => {
    setTemplatesState((prev) =>
      prev.map((template) =>
        template.id === templateId
          ? {
              ...template,
              requirementLinks: template.requirementLinks.filter(
                (link) => link.requirement.id !== requirementId,
              ),
            }
          : template,
      ),
    );
  };

  const handleControlLinked = (templateId: string, control: MappedControl) => {
    setTemplatesState((prev) =>
      prev.map((template) =>
        template.id === templateId
          ? {
              ...template,
              controlLinks: [
                ...template.controlLinks,
                {
                  id: `local_${control.id}`,
                  frameworkId,
                  controlTemplateId: control.id,
                  controlTemplate: { id: control.id, name: control.name },
                },
              ],
            }
          : template,
      ),
    );
  };

  const handleControlUnlinked = (templateId: string, controlTemplateId: string) => {
    setTemplatesState((prev) =>
      prev.map((template) =>
        template.id === templateId
          ? {
              ...template,
              controlLinks: template.controlLinks.filter(
                (link) => link.controlTemplate.id !== controlTemplateId,
              ),
            }
          : template,
      ),
    );
  };

  return {
    data,
    handleRequirementLinked,
    handleRequirementUnlinked,
    handleControlLinked,
    handleControlUnlinked,
  };
}
