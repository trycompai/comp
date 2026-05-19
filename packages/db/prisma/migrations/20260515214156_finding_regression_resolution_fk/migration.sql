-- AddForeignKey
ALTER TABLE "FindingRegression" ADD CONSTRAINT "FindingRegression_previousResolutionId_fkey" FOREIGN KEY ("previousResolutionId") REFERENCES "FindingResolution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
