'use client';

import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';
import type { QuestionAnswer } from '../components/types';

export function useQuestionnaireState() {
  const params = useParams();
  const orgId = params?.orgId as string;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [results, setResults] = useState<QuestionAnswer[] | null>(null);
  const [extractedContent, setExtractedContent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingAnswer, setEditingAnswer] = useState('');
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [questionStatuses, setQuestionStatuses] = useState<
    Map<number, 'pending' | 'processing' | 'completed'>
  >(new Map());
  const [hasClickedAutoAnswer, setHasClickedAutoAnswer] = useState(false);
  const [answeringQuestionIndex, setAnsweringQuestionIndex] = useState<number | null>(null);
  // Use Set to track multiple questions being processed in parallel
  const [answeringQuestionIndices, setAnsweringQuestionIndices] = useState<Set<number>>(new Set());
  const [parseTaskId, setParseTaskId] = useState<string | null>(null);
  const [parseToken, setParseToken] = useState<string | null>(null);
  const [autoAnswerToken, setAutoAnswerToken] = useState<string | null>(null);
  const [singleAnswerToken, setSingleAnswerToken] = useState<string | null>(null);
  const [isParseProcessStarted, setIsParseProcessStarted] = useState(false);
  const [isAutoAnswerProcessStarted, setIsAutoAnswerProcessStarted] = useState(false);
  const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);
  const isAutoAnswerProcessStartedRef = useRef(false);

  const resetState = () => {
    setSelectedFile(null);
    setResults(null);
    setExtractedContent(null);
    setSearchQuery('');
    setEditingIndex(null);
    setEditingAnswer('');
    setQuestionStatuses(new Map());
    setExpandedSources(new Set());
    setAnsweringQuestionIndex(null);
    setIsParseProcessStarted(false);
    isAutoAnswerProcessStartedRef.current = false;
    setIsAutoAnswerProcessStarted(false);
    setQuestionnaireId(null);
  };

  return {
    orgId,
    selectedFile,
    setSelectedFile,
    showExitDialog,
    setShowExitDialog,
    results,
    setResults,
    extractedContent,
    setExtractedContent,
    searchQuery,
    setSearchQuery,
    editingIndex,
    setEditingIndex,
    editingAnswer,
    setEditingAnswer,
    expandedSources,
    setExpandedSources,
    questionStatuses,
    setQuestionStatuses,
    hasClickedAutoAnswer,
    setHasClickedAutoAnswer,
    answeringQuestionIndex,
    setAnsweringQuestionIndex,
    answeringQuestionIndices,
    setAnsweringQuestionIndices,
    parseTaskId,
    setParseTaskId,
    parseToken,
    setParseToken,
    autoAnswerToken,
    setAutoAnswerToken,
    singleAnswerToken,
    setSingleAnswerToken,
    isParseProcessStarted,
    setIsParseProcessStarted,
    isAutoAnswerProcessStarted,
    setIsAutoAnswerProcessStarted,
    isAutoAnswerProcessStartedRef,
    questionnaireId,
    setQuestionnaireId,
    resetState,
  };
}

