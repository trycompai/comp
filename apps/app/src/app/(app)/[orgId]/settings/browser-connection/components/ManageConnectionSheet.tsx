'use client';

import { VendorLogo } from '@/components/VendorLogo';
import {
  Button,
  Input,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetTitle,
} from '@trycompai/design-system';
import { Close, Locked } from '@trycompai/design-system/icons';
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </div>
  );
}

function FactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="flex-none text-[11px] text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-[12px] text-foreground">{children}</span>
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
  // Reconnect goes solid teal only when the session actually needs attention.
  const attention = meta.needsAction;
  const automationCount = connection.automationCount ?? 0;

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

        {/* Identity header — favicon + name + host, status pill, blocked reason. */}
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <VendorLogo hostname={connection.hostname} size={40} />
            <div className="min-w-0">
              <SheetTitle>{connection.displayName || connection.hostname}</SheetTitle>
              <SheetDescription>{connection.hostname}</SheetDescription>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center rounded-sm px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]"
              style={{ background: meta.bg, color: meta.color }}
            >
              {meta.label}
            </span>
            {!canManage && (
              <span className="inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                View only
              </span>
            )}
          </div>
          {connection.status === 'blocked' && connection.blockedReason && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-destructive">
              {connection.blockedReason}
            </p>
          )}
        </div>

        <SheetBody>
          <div className="flex flex-col gap-5">
            {/* Facts */}
            <div className="divide-y divide-border rounded-md border border-border">
              <FactRow label="Method">{method === 'password' ? 'Password' : 'SSO'}</FactRow>
              <FactRow label="Connected as">{connection.loginIdentity || '—'}</FactRow>
              <FactRow label="Automations">{automationCount}</FactRow>
              <FactRow label="Status">
                <span style={{ color: meta.color }}>{meta.label}</span>
              </FactRow>
              {secured && (
                <FactRow label="Credentials">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Locked size={11} />
                    Secured by 1Password
                  </span>
                </FactRow>
              )}
            </div>

            {canManage && (
              <>
                {/* Session */}
                <section className="flex flex-col gap-2">
                  <SectionLabel>Session</SectionLabel>
                  <Button
                    variant={attention ? 'default' : 'outline'}
                    width="full"
                    disabled={busy}
                    onClick={() => onReconnect(connection)}
                  >
                    Reconnect
                  </Button>
                  <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                    Signs in again in a live browser and refreshes the saved session.
                  </p>
                </section>

                {/* Details */}
                <section className="flex flex-col gap-3">
                  <SectionLabel>Details</SectionLabel>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] text-muted-foreground">Name</span>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
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

                  {/* Login — password connections only (SSO has no stored password). */}
                  {method === 'password' && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] text-muted-foreground">Login</span>
                      {!showCredForm ? (
                        <>
                          <div>
                            <Button variant="outline" onClick={() => setShowCredForm(true)}>
                              Change login
                            </Button>
                          </div>
                          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                            Rotated the account? Store the new email and password here.
                          </p>
                        </>
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
                </section>
              </>
            )}
          </div>
        </SheetBody>

        {/* Danger zone (pinned) — or a read-only note when the user can't manage. */}
        {canManage && canRemove ? (
          <SheetFooter>
            {!confirmingRemove ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] text-foreground">Remove connection</div>
                  {automationCount > 0 && (
                    <div className="mt-0.5 text-[10.5px] text-muted-foreground">
                      {automationCount} {automationCount === 1 ? 'automation relies' : 'automations rely'}{' '}
                      on it
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmingRemove(true)}
                >
                  Remove…
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-[11.5px] leading-relaxed text-foreground">
                  {automationCount > 0
                    ? `Remove this connection? ${automationCount} automation${
                        automationCount === 1 ? '' : 's'
                      } that rely on it stop running until it's reconnected.`
                    : "Remove this connection? Anything that relies on it stops working until it's reconnected."}
                </p>
                <div className="flex gap-2">
                  <Button variant="destructive" disabled={busy} onClick={() => onRemove(connection)}>
                    Remove
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmingRemove(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </SheetFooter>
        ) : !canManage ? (
          <SheetFooter>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              You have view access. Ask an admin to reconnect, rename, or remove this connection.
            </p>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
