-- Prevent duplicate integration-sourced devices for the same connection and
-- back the device-sync fallback lookup (externalDeviceId + integrationConnectionId).
-- Postgres treats NULLs as distinct, so agent/serial-only rows (NULL
-- integrationConnectionId and/or NULL externalDeviceId) are unaffected.
-- CreateIndex
CREATE UNIQUE INDEX "Device_integrationConnectionId_externalDeviceId_key" ON "Device"("integrationConnectionId", "externalDeviceId");
