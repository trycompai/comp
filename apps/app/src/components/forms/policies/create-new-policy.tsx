'use client';

import { useApi } from '@/hooks/use-api';
import { createPolicySchema, type CreatePolicySchema } from '@/actions/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label, Stack, Text, Textarea } from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export function CreateNewPolicyForm() {
  const api = useApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const closeSheet = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('create-policy-sheet');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

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

  const onSubmit = async (data: CreatePolicySchema) => {
    setIsLoading(true);
    const response = await api.post('/v1/policies', {
      name: data.title,
      description: data.description,
      content: [],
    });
    setIsLoading(false);

    if (response.error) {
      toast.error('Failed to create policy');
      return;
    }

    toast.success('Policy successfully created');
    closeSheet();
  };

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
