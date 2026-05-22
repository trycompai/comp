'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@trycompai/design-system';
import { Check, Pencil, Search, Trash2, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface ManageFamiliesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  families: Array<{ name: string; count: number }>;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (familyName: string) => void;
}

export function ManageFamiliesDialog({
  open,
  onOpenChange,
  families,
  onRename,
  onDelete,
}: ManageFamiliesDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingFamily, setEditingFamily] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingFamily, setDeletingFamily] = useState<string | null>(null);

  const filteredFamilies = useMemo(() => {
    if (!searchTerm.trim()) return families;
    const lower = searchTerm.toLowerCase();
    return families.filter((f) => f.name.toLowerCase().includes(lower));
  }, [families, searchTerm]);

  const handleStartEdit = useCallback((familyName: string) => {
    setEditingFamily(familyName);
    setEditValue(familyName);
    setDeletingFamily(null);
  }, []);

  const handleConfirmEdit = useCallback(() => {
    if (!editingFamily) return;
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== editingFamily) {
      onRename(editingFamily, trimmed);
    }
    setEditingFamily(null);
    setEditValue('');
  }, [editingFamily, editValue, onRename]);

  const handleCancelEdit = useCallback(() => {
    setEditingFamily(null);
    setEditValue('');
  }, []);

  const handleStartDelete = useCallback((familyName: string) => {
    setDeletingFamily(familyName);
    setEditingFamily(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deletingFamily) return;
    onDelete(deletingFamily);
    setDeletingFamily(null);
  }, [deletingFamily, onDelete]);

  const handleCancelDelete = useCallback(() => {
    setDeletingFamily(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleConfirmEdit();
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleConfirmEdit, handleCancelEdit],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Manage Control Families</DialogTitle>
          <DialogDescription>
            Rename or remove control families. Changes apply to all controls using that family.
          </DialogDescription>
        </DialogHeader>

        <div className="border-border flex items-center rounded-md border px-3 py-2">
          <Search className="text-muted-foreground mr-2 h-4 w-4 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search families..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <div className="max-h-80 space-y-1 overflow-y-auto">
          {filteredFamilies.map((family) => (
            <FamilyRow
              key={family.name}
              family={family}
              isEditing={editingFamily === family.name}
              isDeleting={deletingFamily === family.name}
              editValue={editValue}
              onEditValueChange={setEditValue}
              onStartEdit={handleStartEdit}
              onConfirmEdit={handleConfirmEdit}
              onCancelEdit={handleCancelEdit}
              onStartDelete={handleStartDelete}
              onConfirmDelete={handleConfirmDelete}
              onCancelDelete={handleCancelDelete}
              onKeyDown={handleKeyDown}
            />
          ))}
          {filteredFamilies.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {families.length === 0 ? 'No control families found.' : 'No matching families.'}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FamilyRowProps {
  family: { name: string; count: number };
  isEditing: boolean;
  isDeleting: boolean;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onStartEdit: (name: string) => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onStartDelete: (name: string) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

function FamilyRow({
  family,
  isEditing,
  isDeleting,
  editValue,
  onEditValueChange,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
  onStartDelete,
  onConfirmDelete,
  onCancelDelete,
  onKeyDown,
}: FamilyRowProps) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2 rounded px-2 py-1.5">
        <input
          type="text"
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="border-border bg-background flex-1 rounded border px-2 py-1 text-sm"
          autoFocus
        />
        <button
          type="button"
          onClick={onConfirmEdit}
          className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onCancelEdit}
          className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (isDeleting) {
    return (
      <div className="flex items-center justify-between rounded px-2 py-1.5">
        <span className="text-destructive text-sm">
          Remove from {family.count} control{family.count !== 1 ? 's' : ''}?
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onConfirmDelete}
            className="bg-destructive text-destructive-foreground rounded px-2 py-0.5 text-xs transition-colors hover:opacity-90"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={onCancelDelete}
            className="text-muted-foreground hover:text-foreground rounded px-2 py-0.5 text-xs transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hover:bg-muted/50 group flex items-center justify-between rounded px-2 py-1.5">
      <div className="min-w-0 flex-1">
        <span className="text-sm">{family.name}</span>
        <span className="text-muted-foreground ml-2 text-xs">
          Used by {family.count} control{family.count !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onStartEdit(family.name)}
          className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onStartDelete(family.name)}
          className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
