import { Injectable, Logger } from '@nestjs/common';
import {
  buildReadiness,
  configInvalidReadiness,
  loadConfig,
  type DependencyReport,
  type ReadinessReport,
} from '@dc/config';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  async readiness(): Promise<ReadinessReport> {
    const result = loadConfig();
    if (!result.ok) return configInvalidReadiness(result.problems);

    const dependencies: DependencyReport[] = [
      // Phase 0.1 reports the shape and leaves the probes unchecked. Each becomes a real
      // check when the adapter that owns it lands: Postgres with the shared kernel (0.3),
      // identity with FD01 (1.1), object store and scanner with FD02 (1.2).
      { name: 'postgres', status: 'unchecked' },
      { name: 'identity', status: 'unchecked' },
      { name: 'object_store', status: 'unchecked' },
      { name: 'scanner', status: 'unchecked' },
    ];

    const report = buildReadiness(result.config, dependencies);
    // `unchecked` is not `up`, so the process reports not-ready until the probes exist.
    // That is the honest answer, and it keeps this endpoint from lying for five phases.
    if (!report.ready) this.logger.warn('not ready: dependency probes are not implemented yet');
    return report;
  }
}
