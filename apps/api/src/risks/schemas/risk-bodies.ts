import type { ApiBodyOptions } from '@nestjs/swagger';
import { CreateRiskDto } from '../dto/create-risk.dto';
import { UpdateRiskDto } from '../dto/update-risk.dto';

export const RISK_BODIES: Record<string, ApiBodyOptions> = {
  createRisk: {
    description: 'Risk creation data',
    type: CreateRiskDto,
  },
  updateRisk: {
    description: 'Risk update data',
    type: UpdateRiskDto,
  },
};
