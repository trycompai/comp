'use client';

import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@comp/ui/dialog';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Textarea } from '@comp/ui/textarea';
import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface AddSecretDialogProps {
  onSecretAdded?: () => void;
}

export function AddSecretDialog({ onSecretAdded }: AddSecretDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    description: '',
    category: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.value) {
      toast.error('Please provide both name and value for the secret');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get organizationId from the URL path
      const pathSegments = window.location.pathname.split('/');
      const orgId = pathSegments[1]; // Assuming path is /{orgId}/settings/secrets

      const response = await fetch('/api/secrets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          value: formData.value,
          description: formData.description || null,
          category: formData.category || null,
          organizationId: orgId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create secret');
      }

      toast.success('Secret created successfully');
      setOpen(false);
      setFormData({ name: '', value: '', description: '', category: '' });

      // Reload the page or call the callback
      if (onSecretAdded) {
        onSecretAdded();
      } else {
        window.location.reload();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create secret');
      console.error('Error creating secret:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Secret
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Secret</DialogTitle>
            <DialogDescription>
              Create a new secret that can be accessed by AI automations in your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Secret Name</Label>
              <Input
                id="name"
                placeholder="e.g., GITHUB_TOKEN, OPENAI_API_KEY"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Use uppercase with underscores for naming convention
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="value">Secret Value</Label>
              <Input
                id="value"
                type="password"
                placeholder="Enter the secret value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category (Optional)</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="api_keys">API Keys</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="authentication">Authentication</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe what this secret is used for"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Secret'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
