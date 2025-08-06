'use client';

import type { modelID } from '@/hooks/ai/providers';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@comp/ui/select';
import { useGT } from 'gt-next';

interface ModelPickerProps {
  selectedModel: modelID;
  setSelectedModel: (model: modelID) => void;
}

const getModels = (t: (content: string) => string): Record<modelID, string> => ({
  'deepseek-r1-distill-llama-70b': t('A reasoning model'),
});

export const ModelPicker = ({ selectedModel, setSelectedModel }: ModelPickerProps) => {
  const t = useGT();
  const models = getModels(t);
  return (
    <div className="absolute bottom-2 left-2 flex flex-col gap-2">
      <Select value={selectedModel} onValueChange={setSelectedModel}>
        <SelectTrigger className="">
          <SelectValue placeholder={t('Select a model')} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {Object.entries(models).map(([modelId]) => (
              <SelectItem key={modelId} value={modelId}>
                {modelId}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
