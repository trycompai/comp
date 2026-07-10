'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, HStack } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { useForm } from 'react-hook-form';
import { RoleFields } from './RoleFields';
import { roleSchema, type RoleFormValues } from './role-schema';
import { IsmsAddCard } from './shared';

interface RolesFormProps {
  onAdd: (values: RoleFormValues) => Promise<void>;
}

const EMPTY_ROLE: RoleFormValues = {
  name: '',
  description: '',
  responsibilities: '',
  authorities: '',
  authorityGrantedBy: 'Top Management',
  requiredCompetence: '',
};

export function RolesForm({ onAdd }: RolesFormProps) {
  return (
    <IsmsAddCard addLabel="Add custom role" formTitle="New custom role">
      {({ close }) => <CustomRoleFields onAdd={onAdd} onClose={close} />}
    </IsmsAddCard>
  );
}

function CustomRoleFields({
  onAdd,
  onClose,
}: RolesFormProps & { onClose: () => void }) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: EMPTY_ROLE,
  });

  const handleAdd = handleSubmit(async (values) => {
    try {
      await onAdd(values);
    } catch {
      return;
    }
    reset(EMPTY_ROLE);
    onClose();
  });

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-3">
      <RoleFields control={control} showName />
      <HStack justify="end">
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          loading={isSubmitting}
          disabled={isSubmitting}
          iconLeft={<Add size={16} />}
        >
          Add role
        </Button>
      </HStack>
    </form>
  );
}
