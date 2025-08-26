import { Icons } from '@comp/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@comp/ui/popover';
import { Textarea as ShadcnTextarea } from '@comp/ui/textarea';
import { useRouter } from 'next/navigation';

interface InputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
  status: string;
  stop: () => void;
}

export const ChatTextarea = ({ input, handleInputChange, isLoading }: InputProps) => {
  const router = useRouter();

  const handleOpenUrl = (url: string) => {
    router.push(url);
  };
  return (
    <div className="relative w-full">
      <ShadcnTextarea
        className="mb-2 h-12 min-h-12 resize-none  pt-3"
        value={input}
        autoFocus
        placeholder={'Ask Comp AI something...'}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() && !isLoading) {
              // @ts-expect-error err
              const form = e.target.closest('form');
              if (form) form.requestSubmit();
            }
          }
        }}
      />

      <div className="hidden h-[40px] w-full items-center px-3 backdrop-blur-lg backdrop-filter md:flex ">
        <Popover>
          <PopoverTrigger>
            <div className="-ml-2 scale-50 opacity-50">
              <Icons.Logo />
            </div>
          </PopoverTrigger>

          <PopoverContent
            className="bg-background -ml-2 w-auto rounded-lg p-2 backdrop-blur-lg backdrop-filter"
            side="top"
            align="start"
            sideOffset={10}
          >
            <ul className="flex flex-col space-y-2">
              <li>
                <button
                  type="button"
                  className="flex w-full items-center space-x-2 rounded-sm p-1 text-xs transition-colors hover:bg-[#F2F1EF]"
                  onClick={() => handleOpenUrl('https://x.com/compai')}
                >
                  <Icons.X className="h-[16px] w-[16px]" />
                  <span>Follow Comp AI</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="flex w-full items-center space-x-2 rounded-sm p-1 text-xs transition-colors hover:bg-[#F2F1EF]"
                  onClick={() => handleOpenUrl('https://discord.gg/compai')}
                >
                  <Icons.Discord className="h-[16px] w-[16px]" />
                  <span>Join our Discord</span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  className="flex w-full items-center space-x-2 rounded-sm p-1 text-xs transition-colors hover:bg-[#F2F1EF]"
                  onClick={() => handleOpenUrl('https://git.new/compai')}
                >
                  <Icons.GithubOutline className="h-[16px] w-[16px]" />
                  <span>GitHub</span>
                </button>
              </li>
            </ul>
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex space-x-4">
          <button className="flex items-center space-x-2 text-xs" type="submit">
            <span>Submit</span>
            <kbd className="bg-accent pointer-events-none h-5 items-center gap-1 rounded-sm border px-1.5 font-mono text-[10px] font-medium select-none">
              <span>↵</span>
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
};
