'use client';

import {
  Button,
  Input,
  Label,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@trycompai/design-system';
import { Close, Locked, Renew, TrashCan } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { methodOf, statusMeta, type Connection } from './connection-format';

interface ManageConnectionSheetProps {
  connection: Connection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  canRemove: boolean;
  busy: boolean;
  onReconnect: (connection: Connection) => void;
  onRename: (connection: Connection, name: string) => Promise<void> | void;
  onChangeLogin: (
    connection: Connection,
    creds: { username: string; password: string },
  ) => Promise<void> | void;
  onRemove: (connection: Connection) => Promise<void> | void;
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-foreground">{children}</span>
    </div>
  );
}

export function ManageConnectionSheet({
  connection,
  open,
  onOpenChange,
  canManage,
  canRemove,
  busy,
  onReconnect,
  onRename,
  onChangeLogin,
  onRemove,
}: ManageConnectionSheetProps) {
  const [name, setName] = useState('');
  const [showCredForm, setShowCredForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  // Reset the form each time a different connection is opened.
  useEffect(() => {
    setName(connection?.displayName ?? '');
    setShowCredForm(false);
    setUsername('');
    setPassword('');
    setConfirmingRemove(false);
  }, [connection]);

  if (!connection) return null;

  const method = methodOf(connection);
  const meta = statusMeta(connection.status);
  const nameChanged = name.trim() && name.trim() !== connection.displayName;
  const secured = Boolean(connection.vaultProvider || connection.vaultExternalItemRef);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* The DS SheetContent's built-in close positions itself via a className on
          a DS Button, which drops className — so it falls to the bottom-left.
          Hide it and render our own, correctly pinned to the top-right. */}
      <SheetContent showCloseButton={false}>
        <SheetClose
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Close size={16} />
        </SheetClose>
        <SheetHeader>
          <SheetTitle>{connection.displayName || connection.hostname}</SheetTitle>
          <SheetDescription>{connection.hostname}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="flex flex-col gap-6">
            {/* Session metadata */}
            <div className="rounded-lg border border-border px-4 py-2">
              <MetaRow label="Method">{method === 'password' ? 'Password' : 'SSO'}</MetaRow>
              <MetaRow label="Connected as">{connection.loginIdentity || '—'}</MetaRow>
              <MetaRow label="Automations">{connection.automationCount ?? 0}</MetaRow>
              <MetaRow label="Status">
                <span style={{ color: meta.color }}>{meta.label}</span>
              </MetaRow>
              {secured && (
                <MetaRow label="Credentials">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Locked size={12} />
                    Secured by 1Password
                  </span>
                </MetaRow>
              )}
            </div>

            {connection.status === 'blocked' && connection.blockedReason && (
              <p className="text-[12.5px] leading-relaxed text-destructive">
                {connection.blockedReason}
              </p>
            )}

            {canManage && (
              <>
                {/* Reconnect */}
                <div className="flex flex-col gap-2">
                  <Label>Session</Label>
                  <p className="text-[12px] text-muted-foreground">
                    Sign in again in a live browser to refresh this connection.
                  </p>
                  <div>
                    <Button
                      variant="outline"
                      onClick={() => onReconnect(connection)}
                      disabled={busy}
                      iconLeft={<Renew size={13} />}
                    >
                      Reconnect
                    </Button>
                  </div>
                </div>

                {/* Rename */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="conn-name">Name</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        id="conn-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder={connection.hostname}
                      />
                    </div>
                    <Button
                      variant="outline"
                      disabled={!nameChanged || busy}
                      onClick={() => onRename(connection, name.trim())}
                    >
                      Save
                    </Button>
                  </div>
                </div>

                {/* Change login (password connections only) */}
                {method === 'password' && (
                  <div className="flex flex-col gap-2">
                    <Label>Login</Label>
                    {!showCredForm ? (
                      <div>
                        <Button variant="outline" onClick={() => setShowCredForm(true)}>
                          Change login
                        </Button>
                        <p className="mt-1.5 text-[12px] text-muted-foreground">
                          Rotated the account? Enter the new email and password.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Input
                          value={username}
                          onChange={(event) => setUsername(event.target.value)}
                          placeholder="New email / username"
                          autoComplete="off"
                        />
                        <Input
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="New password"
                          autoComplete="new-password"
                        />
                        <div className="flex gap-2">
                          <Button
                            disabled={!username.trim() || !password || busy}
                            onClick={() =>
                              onChangeLogin(connection, {
                                username: username.trim(),
                                password,
                              })
                            }
                          >
                            Save login
                          </Button>
                          <Button variant="ghost" onClick={() => setShowCredForm(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Remove */}
                {canRemove && (
                <div className="flex flex-col gap-2 border-t border-border pt-4">
                  {!confirmingRemove ? (
                    <div>
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmingRemove(true)}
                        iconLeft={<TrashCan size={13} />}
                      >
                        Remove connection
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                      <p className="text-[12.5px] text-foreground">
                        {connection.automationCount && connection.automationCount > 0
                          ? `Remove this connection? ${connection.automationCount} automation${
                              connection.automationCount === 1 ? '' : 's'
                            } that rely on it stop running until it's reconnected.`
                          : "Remove this connection? Anything that relies on it stops working until it's reconnected."}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          disabled={busy}
                          onClick={() => onRemove(connection)}
                        >
                          Remove
                        </Button>
                        <Button variant="ghost" onClick={() => setConfirmingRemove(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                )}
              </>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
