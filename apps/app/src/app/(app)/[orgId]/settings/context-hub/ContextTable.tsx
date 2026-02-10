'use client';

import { isJSON } from '@/lib/utils';
import { useMediaQuery } from '@comp/ui/hooks';
import type { Context } from '@db';
import { useContextEntries } from './hooks/useContextEntries';
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HStack,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import {
  Add,
  Close,
  Edit,
  OverflowMenuVertical,
  Search,
  TrashCan,
} from '@trycompai/design-system/icons';
import { Check, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ContextForm } from './components/context-form';

// Editable answer cell - click to edit
function EditableAnswerCell({ context }: { context: Context }) {
  const { updateEntry } = useContextEntries();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [value, setValue] = useState(context.answer);
  const [structuredValue, setStructuredValue] = useState<Record<string, string> | null>(null);
  const [arrayValue, setArrayValue] = useState<Record<string, string>[] | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse structured data when entering edit mode
  useEffect(() => {
    if (isEditing && isJSON(context.answer)) {
      const parsed = JSON.parse(context.answer);
      if (Array.isArray(parsed)) {
        setArrayValue(parsed);
        setStructuredValue(null);
      } else if (typeof parsed === 'object') {
        setStructuredValue(parsed);
        setArrayValue(null);
      }
    }
  }, [isEditing, context.answer]);

  useEffect(() => {
    if (isEditing && textareaRef.current && !structuredValue && !arrayValue) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing, structuredValue, arrayValue]);

  // Reset value when context changes
  useEffect(() => {
    setValue(context.answer);
  }, [context.answer]);

  const handleSave = useCallback(async () => {
    let finalValue = value;

    // Convert structured data back to JSON
    if (arrayValue) {
      finalValue = JSON.stringify(arrayValue);
    } else if (structuredValue) {
      finalValue = JSON.stringify(structuredValue);
    }

    if (finalValue.trim() && finalValue !== context.answer) {
      setIsSubmitting(true);
      try {
        await updateEntry(context.id, {
          question: context.question,
          answer: finalValue,
        });
        setIsEditing(false);
        toast.success('Answer updated');
      } catch {
        setValue(context.answer);
        toast.error('Failed to update answer');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsEditing(false);
      setValue(context.answer);
    }
  }, [value, arrayValue, structuredValue, context.answer, context.id, context.question, updateEntry]);

  const handleCancel = useCallback(() => {
    setValue(context.answer);
    setStructuredValue(null);
    setArrayValue(null);
    setIsEditing(false);
  }, [context.answer]);

  // Update a field in structured object
  const updateStructuredField = (key: string, newValue: string) => {
    if (structuredValue) {
      setStructuredValue({ ...structuredValue, [key]: newValue });
    }
  };

  // Update a field in array item
  const updateArrayItem = (index: number, key: string, newValue: string) => {
    if (arrayValue) {
      const newArray = [...arrayValue];
      newArray[index] = { ...newArray[index], [key]: newValue };
      setArrayValue(newArray);
    }
  };

  // Add new item to array
  const addArrayItem = () => {
    if (arrayValue) {
      let template: Record<string, string>;
      if (arrayValue.length > 0) {
        template = Object.keys(arrayValue[0]).reduce((acc, key) => ({ ...acc, [key]: '' }), {});
      } else {
        if (
          context.question.toLowerCase().includes('c-suite') ||
          context.question.toLowerCase().includes('executive')
        ) {
          template = { name: '', title: '' };
        } else {
          template = { name: '', value: '' };
        }
      }
      setArrayValue([...arrayValue, template]);
    }
  };

  // Remove item from array
  const removeArrayItem = (index: number) => {
    if (arrayValue && arrayValue.length > 1) {
      setArrayValue(arrayValue.filter((_, i) => i !== index));
    }
  };

  if (isEditing) {
    // Render array editor
    if (arrayValue) {
      return (
        <Stack gap="sm">
          <Stack gap="xs">
            {arrayValue.length === 0 && (
              <Text variant="muted" size="sm">
                No items. Click &quot;Add Item&quot; to start.
              </Text>
            )}
            {arrayValue.map((item, index) => {
              const keys = Object.keys(item);
              return (
                <div key={index} className="flex items-center gap-2 rounded-md bg-muted/30 p-2">
                  {keys.map((key) => (
                    <input
                      key={key}
                      type="text"
                      value={item[key] || ''}
                      onChange={(e) => updateArrayItem(index, key, e.target.value)}
                      placeholder={key}
                      className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
                      disabled={isSubmitting}
                    />
                  ))}
                  {arrayValue.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeArrayItem(index)}
                      disabled={isSubmitting}
                    >
                      <TrashCan size={14} />
                    </Button>
                  )}
                </div>
              );
            })}
          </Stack>
          <Button
            variant="outline"
            size="sm"
            onClick={addArrayItem}
            disabled={isSubmitting}
          >
            <Add size={14} />
            Add Item
          </Button>
          <HStack gap="2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1 h-4 w-4" />
              )}
              Save
            </Button>
          </HStack>
        </Stack>
      );
    }

    // Render object editor
    if (structuredValue) {
      return (
        <Stack gap="sm">
          <Stack gap="xs">
            {Object.entries(structuredValue).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs font-medium capitalize text-muted-foreground">
                  {key}
                </span>
                <input
                  type="text"
                  value={val || ''}
                  onChange={(e) => updateStructuredField(key, e.target.value)}
                  className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
                  disabled={isSubmitting}
                />
              </div>
            ))}
          </Stack>
          <HStack gap="2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1 h-4 w-4" />
              )}
              Save
            </Button>
          </HStack>
        </Stack>
      );
    }

    // Render plain text editor
    return (
      <Stack gap="sm">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={isSubmitting}
        />
        <HStack gap="2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1 h-4 w-4" />
            )}
            Save
          </Button>
        </HStack>
      </Stack>
    );
  }

  // Render clickable content with hover state
  const renderContent = () => {
    if (isJSON(context.answer)) {
      const parsed = JSON.parse(context.answer);

      // Handle arrays
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          return (
            <Text variant="muted" size="sm">
              Empty list
            </Text>
          );
        }
        return (
          <Stack gap="xs">
            {parsed.map((item, index) => (
              <Text key={index} size="sm">
                {typeof item === 'object'
                  ? Object.entries(item)
                      .filter(([, v]) => !!v)
                      .map(([, v]) => `${v}`)
                      .join(' — ')
                  : String(item)}
              </Text>
            ))}
          </Stack>
        );
      }

      // Handle objects
      return (
        <Stack gap="xs">
          {Object.entries(parsed)
            .filter(([, val]) => !!val)
            .map(([key, val]) => (
              <Text key={key} size="sm">
                <span className="font-medium capitalize">{key}: </span>
                <span>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
              </Text>
            ))}
        </Stack>
      );
    }
    return <span className="line-clamp-3 text-sm">{context.answer}</span>;
  };

  return (
    <div
      className="group relative -mx-2 -my-1.5 cursor-pointer rounded-xs px-2 py-1.5 transition-colors hover:bg-muted/50"
      onClick={() => setIsEditing(true)}
    >
      <div className="pr-6">{renderContent()}</div>
      <Edit className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

// Actions cell with dropdown
function ActionsCell({ context }: { context: Context }) {
  const { deleteEntry } = useContextEntries();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEntry(context.id);
      setDeleteOpen(false);
      toast.success('Entry deleted');
    } catch {
      toast.error('Failed to delete entry');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger variant="ellipsis">
          <OverflowMenuVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <TrashCan size={16} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Local version of CreateContextSheet that accepts open/onOpenChange props
function CreateContextSheetLocal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Add Context Entry</SheetTitle>
              <Button size="icon" variant="ghost" onClick={() => onOpenChange(false)}>
                <Close size={20} />
              </Button>
            </div>
            <SheetDescription>
              Provide extra context to Comp AI about your organization.
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <ContextForm onSuccess={() => onOpenChange(false)} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add Context Entry</DrawerTitle>
          <DrawerDescription>
            Provide extra context to Comp AI about your organization.
          </DrawerDescription>
        </DrawerHeader>
        <ContextForm onSuccess={() => onOpenChange(false)} />
      </DrawerContent>
    </Drawer>
  );
}

export const ContextTable = ({ entries: initialEntries }: { entries: Context[]; pageCount: number }) => {
  const { entries } = useContextEntries({ initialData: initialEntries });
  const [search, setSearch] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const lowerSearch = search.toLowerCase();
    return entries.filter(
      (entry) =>
        entry.question.toLowerCase().includes(lowerSearch) ||
        entry.answer.toLowerCase().includes(lowerSearch),
    );
  }, [entries, search]);

  return (
    <Stack gap="md">
      {/* Toolbar */}
      <HStack justify="between" align="center" wrap="wrap" gap="3">
        <div className="w-full md:max-w-[300px]">
          <InputGroup>
            <InputGroupAddon>
              <Search size={16} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search context..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>
        <Button onClick={() => setIsSheetOpen(true)}>
          <Add size={16} />
          Add Entry
        </Button>
      </HStack>

      {/* Table */}
      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: '35%' }}>QUESTION</TableHead>
            <TableHead style={{ width: '55%', maxWidth: '500px' }}>ANSWER</TableHead>
            <TableHead style={{ width: '10%' }}>ACTIONS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredEntries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3}>
                <div className="flex items-center justify-center py-8">
                  <Text variant="muted">
                    {search ? 'No entries match your search' : 'No context entries yet'}
                  </Text>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <Text size="sm">{entry.question}</Text>
                </TableCell>
                <TableCell style={{ maxWidth: '500px' }}>
                  <EditableAnswerCell context={entry} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <ActionsCell context={entry} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Create Sheet */}
      <CreateContextSheetLocal open={isSheetOpen} onOpenChange={setIsSheetOpen} />
    </Stack>
  );
};
