'use client';

import { Icons } from '@comp/ui/icons';
import { Input } from '@comp/ui/input';
import { useQueryState } from 'nuqs';
import { useHotkeys } from 'react-hotkeys-hook';

type Props = {
  placeholder: string;
  shallow?: boolean;
};

export function SearchField({ placeholder, shallow = false }: Props) {
  const [search, setSearch] = useQueryState('q', {
    shallow,
  });

  useHotkeys('esc', () => setSearch(null), {
    enableOnFormTags: true,
  });

  const handleSearch = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const value = evt.target.value;

    if (value) {
      setSearch(value);
    } else {
      setSearch(null);
    }
  };

  return (
    <div className="relative w-full md:max-w-[380px]">
      <Input
        placeholder={placeholder}
        className="w-full"
        value={search ?? ''}
        onChange={handleSearch}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck="false"
        leftIcon={<Icons.Search size={16} />}
      />
    </div>
  );
}
