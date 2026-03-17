'use client';

import { useState, useRef } from 'react';
import { ChevronDown, Settings } from '@trycompai/design-system/icons';
import { PermissionMatrix } from '../../../settings/roles/components/PermissionMatrix';

const BUILT_IN_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'employee', label: 'Employee' },
  { value: 'contractor', label: 'Contractor' },
];

export interface RoleMappingEntry {
  rampRole: string;
  compRole: string;
  isBuiltIn: boolean;
  permissions?: Record<string, string[]>;
  obligations?: Record<string, boolean>;
}

interface RampRoleMappingRowProps {
  entry: RoleMappingEntry;
  existingCustomRoles: Array<{
    name: string;
    permissions: Record<string, string[]>;
    obligations: Record<string, boolean>;
  }>;
  onChange: (updated: RoleMappingEntry) => void;
}

export function RampRoleMappingRow({
  entry,
  existingCustomRoles,
  onChange,
}: RampRoleMappingRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayValue = entry.isBuiltIn
    ? BUILT_IN_ROLES.find((r) => r.value === entry.compRole)?.label ??
      entry.compRole
    : entry.compRole;

  const handleSelectBuiltIn = (value: string) => {
    onChange({
      ...entry,
      compRole: value,
      isBuiltIn: true,
      permissions: undefined,
      obligations: undefined,
    });
    setDropdownOpen(false);
    setCustomInput('');
  };

  const handleCustomSubmit = () => {
    const val = customInput.trim();
    if (!val) return;

    // Check if this matches an existing custom role — use its permissions
    const existingRole = existingCustomRoles.find((r) => r.name === val);

    onChange({
      ...entry,
      compRole: val,
      isBuiltIn: false,
      permissions: existingRole?.permissions ?? {
        policy: ['read'],
        portal: ['read', 'update'],
      },
      obligations: existingRole?.obligations ?? {},
    });
    setDropdownOpen(false);
    setCustomInput('');
  };

  return (
    <div className="py-3 border-b last:border-b-0">
      {/* Two-column mapping row */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        {/* Left: Ramp role */}
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-medium truncate">{entry.rampRole}</p>
          {!entry.isBuiltIn && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className={`shrink-0 p-1 rounded-md transition-colors ${
                expanded
                  ? 'text-foreground bg-muted'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="Customize permissions"
            >
              <Settings size={14} />
            </button>
          )}
        </div>

        {/* Arrow */}
        <span className="text-muted-foreground">&rarr;</span>

        {/* Right: Custom select with inline input */}
        <div className="relative h-9">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            onBlur={(e) => {
              // Close dropdown if focus leaves the entire dropdown area
              if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.relatedTarget)
              ) {
                setDropdownOpen(false);
              }
            }}
            className="w-full h-full flex items-center justify-between text-sm border rounded-md px-2.5 bg-background hover:bg-muted/50 transition-colors text-left"
          >
            <span className="truncate">{displayValue}</span>
            <ChevronDown
              size={14}
              className={`shrink-0 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 py-1"
            >
              {BUILT_IN_ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => handleSelectBuiltIn(role.value)}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center justify-between"
                >
                  {role.label}
                  {entry.isBuiltIn && entry.compRole === role.value && (
                    <span className="text-foreground">&#10003;</span>
                  )}
                </button>
              ))}

              {/* Existing custom roles */}
              {existingCustomRoles.length > 0 && (
                <>
                  <div className="border-t mt-1 pt-1 px-3">
                    <p className="text-xs text-muted-foreground py-1">Custom roles</p>
                  </div>
                  {existingCustomRoles.map((role) => (
                    <button
                      key={role.name}
                      type="button"
                      onClick={() => {
                        onChange({
                          ...entry,
                          compRole: role.name,
                          isBuiltIn: false,
                          permissions: role.permissions,
                          obligations: role.obligations,
                        });
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center justify-between"
                    >
                      {role.name}
                      {!entry.isBuiltIn && entry.compRole === role.name && (
                        <span className="text-foreground">&#10003;</span>
                      )}
                    </button>
                  ))}
                </>
              )}

              {/* New custom role input */}
              <div className="border-t mt-1 pt-1 px-2 pb-1">
                <div className="flex items-center gap-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCustomSubmit();
                      }
                      if (e.key === 'Escape') {
                        setDropdownOpen(false);
                        setCustomInput('');
                      }
                    }}
                    placeholder="Custom role name..."
                    className="flex-1 text-sm px-2 py-1.5 rounded border outline-none focus:ring-1 focus:ring-foreground/20 bg-background"
                  />
                  <button
                    type="button"
                    onClick={handleCustomSubmit}
                    disabled={!customInput.trim()}
                    className="shrink-0 text-sm font-medium px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded permissions for custom roles */}
      {!entry.isBuiltIn && expanded && (
        <div className="mt-3 border-t pt-3">
          <PermissionMatrix
            value={entry.permissions ?? {}}
            onChange={(permissions) =>
              onChange({ ...entry, permissions })
            }
            obligations={entry.obligations}
            onObligationsChange={(obligations) =>
              onChange({ ...entry, obligations })
            }
          />
        </div>
      )}
    </div>
  );
}
