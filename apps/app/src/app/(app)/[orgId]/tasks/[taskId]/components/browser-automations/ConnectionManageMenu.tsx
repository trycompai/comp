'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@trycompai/design-system';
import { useState } from 'react';
import type { BrowserAuthProfile } from '../../hooks/types';
import { useConnectionActions } from '../../hooks/useConnectionActions';
import { normalizeUrl } from './connect-url';

interface ConnectionManageMenuProps {
  profile: BrowserAuthProfile;
  onChanged?: () => void;
}

/** ⋯ menu on a connection: inline edit (name / sign-in URL) + guarded remove. */
export function ConnectionManageMenu({ profile, onChanged }: ConnectionManageMenuProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const initialUrl = profile.lastAuthCheckUrl ?? `https://${profile.hostname}`;
  const [name, setName] = useState(profile.displayName);
  const [url, setUrl] = useState(initialUrl);

  const { editConnection, removeConnection, isSaving, isRemoving } =
    useConnectionActions(onChanged);

  const startEdit = () => {
    setName(profile.displayName);
    setUrl(profile.lastAuthCheckUrl ?? `https://${profile.hostname}`);
    setEditing(true);
  };

  const handleSave = async () => {
    const ok = await editConnection(profile.id, {
      displayName: name.trim() || undefined,
      url: normalizeUrl(url) || undefined,
    });
    if (ok) {
      setEditing(false);
      setOpen(false);
    }
  };

  const handleRemove = async () => {
    if (await removeConnection(profile.id)) setRemoveOpen(false);
  };

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setEditing(false);
        }}
      >
        <PopoverTrigger
          aria-label="Manage connection"
          className="grid h-6 w-6 place-items-center rounded-sm text-muted-foreground hover:text-foreground"
        >
          <span className="text-base leading-none">⋯</span>
        </PopoverTrigger>
        <PopoverContent align="end">
          {editing ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor={`conn-name-${profile.id}`}>Name</Label>
                <Input
                  id={`conn-name-${profile.id}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`conn-url-${profile.id}`}>Sign-in URL</Label>
                <Input
                  id={`conn-url-${profile.id}`}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Changing to a different site signs this connection out — you&apos;ll
                be asked to reconnect.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <button
                type="button"
                onClick={startEdit}
                className="rounded-sm px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted"
              >
                Edit connection
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setRemoveOpen(true);
                }}
                className="rounded-sm px-2 py-1.5 text-left text-sm text-destructive hover:bg-muted"
              >
                Remove connection
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {profile.hostname} connection?</AlertDialogTitle>
            <AlertDialogDescription>
              Automations that rely on this connection stop running until you
              reconnect. Evidence already captured is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleRemove}
              loading={isRemoving}
              disabled={isRemoving}
            >
              Remove connection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
