import {
  ArrowDownRight,
  ChartLine,
  CheckmarkFilled,
  DotMark,
  Misuse,
  QOperationGauge,
  Time,
  View,
  Warning,
} from '@trycompai/design-system/icons';
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
      return DotMark;
    case 'done':
      return CheckmarkFilled;
    case 'in_progress':
      return Time;
    case 'in_review':
      return View;
    case 'canceled':
      return Misuse;
    default:
      return DotMark;
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
      return Warning;
    case 'high':
      return ChartLine;
    case 'medium':
      return QOperationGauge;
    case 'low':
      return ArrowDownRight;
    default:
      return QOperationGauge;
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

