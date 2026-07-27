-- FRAME-18: per-framework requirement display order.
-- Nullable so existing requirements keep their current (identifier-based) ordering.
ALTER TABLE "FrameworkEditorRequirement" ADD COLUMN "sortOrder" INTEGER;
