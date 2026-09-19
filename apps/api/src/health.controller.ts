import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service.js';

@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * Liveness. Answers as long as the process is running, and touches no dependency:
   * an orchestrator that restarts the API because Postgres blinked turns one outage
   * into two.
   */
  @Get('/healthz')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /**
   * Readiness. `19-security-operations-delivery.md:63` — *"Required invalid configuration
   * makes the process not ready"* and *"Secret strings never appear in readiness
   * responses."* Both are enforced in @dc/config and covered by its tests.
   */
  @Get('/readyz')
  async ready(@Res() res: Response): Promise<void> {
    const report = await this.health.readiness();
    res.status(report.ready ? 200 : 503).json(report);
  }
}
