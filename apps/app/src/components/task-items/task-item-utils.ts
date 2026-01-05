import {
  Clock3,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Gauge,
  ArrowDownRight,
  Circle,
} from 'lucide-react';
import type { TaskItemStatus, TaskItemPriority } from '@/hooks/use-task-items';

export const STATUS_OPTIONS: { value: TaskItemStatus; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
  { value: 'canceled', label: 'Canceled' },
];

export const PRIORITY_OPTIONS: { value: TaskItemPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const getStatusIcon = (status: TaskItemStatus) => {
  switch (status) {
    case 'todo':
      return Circle;
    case 'done':
      return CheckCircle2;
    case 'in_progress':
      return Clock3;
    case 'in_review':
      return Eye;
    case 'canceled':
      return XCircle;
    default:
      return Circle;
  }
};

export const getStatusColor = (status: TaskItemStatus) => {
  switch (status) {
    case 'done':
      return 'text-primary';
    case 'in_progress':
      return 'text-blue-600 dark:text-blue-400';
    case 'in_review':
      return 'text-purple-600 dark:text-purple-400';
    case 'canceled':
      return 'text-slate-600 dark:text-slate-400';
    default:
      return 'text-slate-600 dark:text-slate-400';
  }
};

export const getPriorityIcon = (priority: TaskItemPriority) => {
  switch (priority) {
    case 'urgent':
      return AlertTriangle;
    case 'high':
      return TrendingUp;
    case 'medium':
      return Gauge;
    case 'low':
      return ArrowDownRight;
    default:
      return Gauge;
  }
};

export const getPriorityColor = (priority: TaskItemPriority) => {
  switch (priority) {
    case 'urgent':
      return 'text-red-600 dark:text-red-400';
    case 'high':
      return 'text-pink-600 dark:text-pink-400';
    case 'medium':
      return 'text-amber-600 dark:text-amber-400';
    case 'low':
      return 'text-slate-600 dark:text-slate-400';
    default:
      return 'text-slate-600 dark:text-slate-400';
  }
};

export const getTaskIdShort = (taskId: string): string => {
  return taskId.slice(-6).toUpperCase();
};

