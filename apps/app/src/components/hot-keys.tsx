'use client';

import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useHotkeys } from 'react-hotkeys-hook';

export function HotKeys() {
  const router = useRouter();
  const [, setAssistantOpen] = useQueryState('assistant', {
    history: 'push',
    parse: (value) => value === 'true',
    serialize: (value) => value.toString(),
  });

  const [showOrganizationSwitcher, setShowOrganizationSwitcher] = useQueryState(
    'showOrganizationSwitcher',
    {
      history: 'push',
      parse: (value) => value === 'true',
      serialize: (value) => value.toString(),
    },
  );

  useHotkeys('ctrl+m', (evt) => {
    evt.preventDefault();
    router.push('/settings/users');
  });

  useHotkeys('meta+m', (evt) => {
    evt.preventDefault();
    router.push('/settings/users');
  });

  useHotkeys('ctrl+e', (evt) => {
    evt.preventDefault();
    router.push('/account/teams');
  });

  useHotkeys('ctrl+a', (evt) => {
    evt.preventDefault();
    router.push('/apps');
  });

  useHotkeys('ctrl+meta+p', (evt) => {
    evt.preventDefault();
    router.push('/account');
  });

  useHotkeys('shift+meta+p', (evt) => {
    evt.preventDefault();
    router.push('/account');
  });

  useHotkeys('meta+k', (evt) => {
    evt.preventDefault();
    setAssistantOpen(true);
  });

  useHotkeys('meta+o', (evt) => {
    evt.preventDefault();
    setShowOrganizationSwitcher(!showOrganizationSwitcher);
  });

  return null;
}
