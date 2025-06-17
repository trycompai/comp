interface PolicyHeaderProps {
  saveStatus: 'Saved' | 'Saving' | 'Unsaved';
}

export function PolicyHeader({ saveStatus }: PolicyHeaderProps) {
  return (
    <div className="mx-auto w-full">
      <div className="flex justify-end">
        <div className="bg-accent/60 flex items-center gap-1 rounded-sm px-2 py-1">
          <span className="text-muted-foreground text-xs">{saveStatus}</span>
        </div>
      </div>
    </div>
  );
}
