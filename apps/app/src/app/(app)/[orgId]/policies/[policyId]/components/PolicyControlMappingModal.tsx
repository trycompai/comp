import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@comp/ui/dialog';
import MultipleSelector, { Option } from '@comp/ui/multiple-selector';
import { Control } from '@db';
import { T, useGT } from 'gt-next';
import { PlusIcon } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { mapPolicyToControls } from '../actions/mapPolicyToControls';

export const PolicyControlMappingModal = ({
  allControls,
  mappedControls,
}: {
  allControls: Control[];
  mappedControls: Control[];
}) => {
  const [open, setOpen] = useState(false);
  const mappedControlIds = new Set(mappedControls.map((c) => c.id));
  const [selectedControls, setSelectedControls] = useState<Option[]>([]);
  const { policyId } = useParams<{ policyId: string }>();
  const t = useGT();

  // Filter out controls that are already mapped
  const filteredControls = allControls.filter((control) => !mappedControlIds.has(control.id));

  // Prepare options for the MultipleSelector
  const preparedOptions = filteredControls.map((control) => ({
    value: control.id,
    label: control.name,
  }));

  const handleMapControls = async () => {
    try {
      console.log(`Mapping controls ${selectedControls.map((c) => c.label)} to policy ${policyId}`);
      await mapPolicyToControls({
        policyId,
        controlIds: selectedControls.map((c) => c.value),
      });
      setOpen(false);
      toast.success(
        t('Controls {controlNames} mapped successfully to policy {policyId}', { 
          controlNames: selectedControls.map((c) => c.label).join(', '), 
          policyId 
        }),
      );
    } catch (error) {
      console.error(error);
      toast.error(t('Failed to map controls'));
    }
  };

  useEffect(() => {
    return () => {
      setSelectedControls([]);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <T>
          <Badge
            variant="secondary"
            className="hover:bg-secondary/80 flex h-5 cursor-pointer items-center self-end"
            onClick={() => setOpen(true)}
          >
            <PlusIcon className="mr-2 h-3 w-3" />
            Link Controls
          </Badge>
        </T>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <T>
            <DialogTitle>Link New Controls</DialogTitle>
          </T>
        </DialogHeader>
        <T>
          <DialogDescription>Select controls you want to link to this policy</DialogDescription>
        </T>
        <MultipleSelector
          placeholder={t('Search or select controls...')}
          value={selectedControls}
          onChange={setSelectedControls}
          options={preparedOptions}
          commandProps={{
            // Custom filter function to match by label (name) instead of value
            filter: (value, search) => {
              // Find the option with this value
              const option = preparedOptions.find((opt) => opt.value === value);
              if (!option) return 0;

              // Check if the option label contains the search string
              return option.label.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            },
          }}
        />
        <DialogFooter>
          <T>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </T>
          <T>
            <Button onClick={handleMapControls}>Map</Button>
          </T>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
