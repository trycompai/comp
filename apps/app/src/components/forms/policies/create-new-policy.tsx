'use client';

import { createPolicyAction } from '@/actions/policies/create-new-policy';
import { createPolicySchema, type CreatePolicySchema } from '@/actions/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label, Stack, Text, Textarea } from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import { useAction } from 'next-safe-action/hooks';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export function CreateNewPolicyForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const closeSheet = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('create-policy-sheet');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const createPolicy = useAction(createPolicyAction, {
    onSuccess: () => {
      toast.success('Policy successfully created');
      closeSheet();
    },
    onError: () => {
      toast.error('Failed to create policy');
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePolicySchema>({
    resolver: zodResolver(createPolicySchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const onSubmit = (data: CreatePolicySchema) => {
    createPolicy.execute(data);
  };

  const isLoading = createPolicy.status === 'executing';

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="md">
        <Stack gap="xs">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            {...register('title')}
            autoFocus
            placeholder="Policy title"
            autoCorrect="off"
          />
          {errors.title && (
            <Text size="sm" variant="destructive">
              {errors.title.message}
            </Text>
          )}
        </Stack>

        <Stack gap="xs">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Brief description of the policy"
            rows={4}
          />
          {errors.description && (
            <Text size="sm" variant="destructive">
              {errors.description.message}
            </Text>
          )}
        </Stack>

        <Button iconRight={<ArrowRight />} loading={isLoading} onClick={handleSubmit(onSubmit)}>
          Create
        </Button>
      </Stack>
    </form>
  );
}
