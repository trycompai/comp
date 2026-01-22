import { Spinner } from '@trycompai/design-system';

export default function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner size="lg" />
    </div>
  );
}
