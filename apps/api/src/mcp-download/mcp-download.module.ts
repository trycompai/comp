import { Module } from '@nestjs/common';
import { McpDownloadController } from './mcp-download.controller';
import { McpDownloadService } from './mcp-download.service';

@Module({
  controllers: [McpDownloadController],
  providers: [McpDownloadService],
})
export class McpDownloadModule {}
