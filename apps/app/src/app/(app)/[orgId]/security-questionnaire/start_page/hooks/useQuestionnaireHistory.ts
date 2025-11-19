'use client';

import { useMemo, useState } from 'react';

interface UseQuestionnaireHistoryProps {
  questionnaires: Awaited<ReturnType<typeof import('../data/queries').getQuestionnaires>>;
}

export function useQuestionnaireHistory({ questionnaires }: UseQuestionnaireHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter questionnaires by filename
  const filteredQuestionnaires = useMemo(() => {
    if (!searchQuery.trim()) {
      return questionnaires;
    }

    const query = searchQuery.toLowerCase();
    return questionnaires.filter((questionnaire: Awaited<ReturnType<typeof import('../data/queries').getQuestionnaires>>[number]) =>
      questionnaire.filename.toLowerCase().includes(query),
    );
  }, [questionnaires, searchQuery]);

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
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedQuestionnaires,
    totalFiltered: filteredQuestionnaires.length,
    handlePageChange,
    handleItemsPerPageChange,
  };
}

