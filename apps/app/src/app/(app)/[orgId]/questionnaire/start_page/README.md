# Start Page (First Step)

This folder contains components and logic for the **first step** of the security questionnaire flow - the start page.

## Structure

```
start_page/
├── components/
│   ├── QuestionnaireOverview.tsx  # Main overview component
│   ├── QuestionnaireHistory.tsx    # History/list component
│   └── index.ts                    # Component exports
└── README.md                       # This file
```

## Purpose

The start page (`/questionnaire`) displays:
- Header with navigation buttons (Questionnaires, Knowledge Base)
- "New Questionnaire" card with button to create a new questionnaire
- History of previously parsed questionnaires

## Flow

1. **First Step (Start Page)**: `/questionnaire` - Shows overview and history
2. **Second Step (Create)**: `/questionnaire/new_questionnaire` - File upload and parsing
3. **View Details**: `/questionnaire/[questionnaireId]` - View individual questionnaire

