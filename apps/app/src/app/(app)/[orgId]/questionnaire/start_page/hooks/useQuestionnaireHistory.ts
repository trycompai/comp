'use client';

import { useMemo, useState } from 'react';

interface UseQuestionnaireHistoryProps {
  questionnaires: Awaited<ReturnType<typeof import('../data/queries').getQuestionnaires>>;
}

export function useQuestionnaireHistory({ questionnaires }: UseQuestionnaireHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'internal' | 'external'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Filter questionnaires by filename and source
  const filteredQuestionnaires = useMemo(() => {
    let filtered = questionnaires;

    // Filter by source
    if (sourceFilter !== 'all') {
      filtered = filtered.filter((questionnaire: Awaited<ReturnType<typeof import('../data/queries').getQuestionnaires>>[number]) =>
        questionnaire.source === sourceFilter,
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((questionnaire: Awaited<ReturnType<typeof import('../data/queries').getQuestionnaires>>[number]) =>
        questionnaire.filename.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [questionnaires, searchQuery, sourceFilter]);

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredQuestionnaires.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedQuestionnaires = filteredQuestionnaires.slice(startIndex, endIndex);

  // Reset to page 1 when search changes or items per page changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSourceFilterChange = (value: 'all' | 'internal' | 'external') => {
    setSourceFilter(value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return {
    searchQuery,
    setSearchQuery: handleSearchChange,
    sourceFilter,
    setSourceFilter: handleSourceFilterChange,
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedQuestionnaires,
    totalFiltered: filteredQuestionnaires.length,
    handlePageChange,
    handleItemsPerPageChange,
  };
}

