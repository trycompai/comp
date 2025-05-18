-- AddForeignKey
ALTER TABLE "FrameworkInstance" ADD CONSTRAINT "FrameworkInstance_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "FrameworkEditorFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementMap" ADD CONSTRAINT "RequirementMap_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "FrameworkEditorRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
