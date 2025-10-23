import { Card, CardDescription, CardHeader } from '@comp/ui/card';
import Image from 'next/image';
import { Textarea } from '../../components/ui/textarea';
import { AUTOMATION_EXAMPLES, AutomationExample } from '../../constants/automation-examples';

interface EmptyStateProps {
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onExampleClick: (prompt: string) => void;
  status: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onSubmit: () => void;
}

export function EmptyState({
  input,
  onInputChange,
  onExampleClick,
  status,
  inputRef,
  onSubmit,
}: EmptyStateProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto h-full z-20">
      <div className="w-full h-full flex flex-col items-center py-48 px-4">
        <div className="w-full max-w-3xl text-center space-y-8 mb-16">
          <p className="text-2xl font-medium text-primary tracking-wide z-20">
            What evidence do you want to collect?
          </p>
          <Textarea
            ref={inputRef}
            placeholder="Check if GitHub dependabot is enabled and tell me the result"
            className="w-full max-w-3xl transition-all duration-200 hover:shadow-md hover:shadow-primary/5 focus:shadow-lg focus:shadow-primary/10 focus:ring-2 focus:ring-primary/30 min-h-[44px] max-h-[200px] resize-none overflow-y-auto"
            value={input}
            onChange={(e) => {
              onInputChange(e);
              // Auto-resize
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
                // Reset height after submit
                if (e.currentTarget) {
                  e.currentTarget.style.height = 'auto';
                }
              }
            }}
            disabled={status === 'streaming' || status === 'submitted'}
            rows={1}
            style={{ height: 'auto' }}
          />
        </div>

        <div className="w-full max-w-4xl space-y-4 mt-16">
          <h3 className="text-lg font-normal text-center">Get started with examples</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
            {AUTOMATION_EXAMPLES.map((example: AutomationExample) => (
              <Card
                key={example.title}
                className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
                onClick={() => onExampleClick(example.prompt)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-start gap-3">
                    <Image
                      src={example.url}
                      alt={example.title}
                      width={24}
                      height={24}
                      className="rounded-sm"
                    />
                    <CardDescription className="flex-1">
                      <p className="text-sm font-normal text-foreground leading-relaxed">
                        {example.title}
                      </p>
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
