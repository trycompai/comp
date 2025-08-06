import { useGT } from 'gt-next';
import { SearchField } from '../search-field';
import { AppsTabs } from './integrations-tabs';

export function IntegrationsHeader() {
  const t = useGT();
  return (
    <div className="flex w-full space-x-4">
      <AppsTabs />
      <SearchField placeholder={t('Search integrations')} shallow />
    </div>
  );
}
