-- Migration: Convert RequirementMap.requirementId values to new format from soc2.map.txt

-- SOC2 requirementId mapping (old -> new)
-- soc2_CC1 -> frk_rq_681e8514778fd2238a33c121
-- soc2_CC2 -> frk_rq_681e85140854c64019d53422
-- soc2_CC3 -> frk_rq_681e8514f62bb35319068677
-- soc2_CC4 -> frk_rq_681e8514cba3ce1991f9d6c8
-- soc2_CC5 -> frk_rq_681e85140e8b698d7154d43e
-- soc2_CC6 -> frk_rq_681e8514753b4054f1a632e7
-- soc2_CC7 -> frk_rq_681e851403a5c3114dc746ba
-- soc2_CC8 -> frk_rq_681e85146ed80156122dd094
-- soc2_CC9 -> frk_rq_681e8514fedb1b2123661713
-- soc2_A1  -> frk_rq_681e8514b7a9c5278ada8527
-- soc2_PI1 -> frk_rq_681e85145df1606ef144c69c
-- soc2_P1  -> frk_rq_681e8514e2ebc08069c2c862
-- soc2_C1  -> frk_rq_681e8514ae9bac0ace4829ae

-- Update RequirementMap table for SOC2 requirements
UPDATE "RequirementMap" SET "requirementId" = 'frk_rq_681e8514778fd2238a33c121' WHERE "requirementId" = 'soc2_CC1';
UPDATE "RequirementMap" SET "requirementId" = 'frk_rq_681e85140854c64019d53422' WHERE "requirementId" = 'soc2_CC2';
UPDATE "RequirementMap" SET "requirementId" = 'frk_rq_681e8514f62bb35319068677' WHERE "requirementId" = 'soc2_CC3';
UPDATE "RequirementMap" SET "requirementId" = 'frk_rq_681e8514cba3ce1991f9d6c8' WHERE "requirementId" = 'soc2_CC4';
UPDATE "RequirementMap" SET "requirementId" = 'frk_rq_681e85140e8b698d7154d43e' WHERE "requirementId" = 'soc2_CC5';
UPDATE "RequirementMap" SET "requirementId" = 'frk_rq_681e8514753b4054f1a632e7' WHERE "requirementId" = 'soc2_CC6';
UPDATE "RequirementMap" SET "requirementId" = 'frk_rq_681e851403a5c3114dc746ba' WHERE "requirementId" = 'soc2_CC7';
UPDATE "RequirementMap" SET "requirementId" = 'frk_rq_681e85146ed80156122dd094' WHERE "requirementId" = 'soc2_CC8';
UPDATE "RequirementMap" SET "requirementId" = 'frk_rq_681e8514fedb1b2123661713' WHERE "requirementId" = 'soc2_CC9';
UPDATE "RequirementMap" SET "requirementId" = 'frk_rq_681e8514b7a9c5278ada8527' WHERE "requirementId" = 'soc2_A1';
UPDATE "RequirementMap" SET "requirementId" = 'frk_rq_681e85145df1606ef144c69c' WHERE "requirementId" = 'soc2_PI1';
UPDATE "RequirementMap" SET "requirementId" = 'frk_rq_681e8514e2ebc08069c2c862' WHERE "requirementId" = 'soc2_P1';
UPDATE "RequirementMap" SET "requirementId" = 'frk_rq_681e8514ae9bac0ace4829ae' WHERE "requirementId" = 'soc2_C1';