-- Rename SOC2 Type I/II columns to use numbers instead of Roman numerals

-- Rename soc2typei to soc2type1
ALTER TABLE "Trust" RENAME COLUMN "soc2typei" TO "soc2type1";

-- Rename soc2typeii to soc2type2
ALTER TABLE "Trust" RENAME COLUMN "soc2typeii" TO "soc2type2";

-- Rename soc2typei_status to soc2type1_status
ALTER TABLE "Trust" RENAME COLUMN "soc2typei_status" TO "soc2type1_status";

-- Rename soc2typeii_status to soc2type2_status
ALTER TABLE "Trust" RENAME COLUMN "soc2typeii_status" TO "soc2type2_status";
