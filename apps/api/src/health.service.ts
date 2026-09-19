import { Injectable, Logger } from '@nestjs/common';
import { createPool } from '@dc/db';
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

  /**
   * The first real dependency probe. Phase 0.3 lands the schema, so Postgres stops being
   * `unchecked` and starts being answered. The other three become real with the adapters
   * that own them: identity at 1.1, object store and scanner at 1.2.
   *
   * A cheap `SELECT 1` on purpose. A readiness probe that runs a business query turns
   * every health check into load, and turns a slow query into a false outage.
   */
  private async probePostgres(): Promise<DependencyReport> {
    const result = loadConfig();
    if (!result.ok) return { name: 'postgres', status: 'down', detail: 'configuration invalid' };
    const pool = createPool(result.config);
    try {
      await pool.query('SELECT 1');
      return { name: 'postgres', status: 'up' };
    } catch {
      // Never surface the driver's message: it carries the connection string.
      return { name: 'postgres', status: 'down', detail: 'connection failed' };
    } finally {
      await pool.end();
    }
  }

  async readiness(): Promise<ReadinessReport> {
    const result = loadConfig();
    if (!result.ok) return configInvalidReadiness(result.problems);

    const dependencies: DependencyReport[] = [
      // Phase 0.1 reports the shape and leaves the probes unchecked. Each becomes a real
      // check when the adapter that owns it lands: Postgres with the shared kernel (0.3),
      // identity with FD01 (1.1), object store and scanner with FD02 (1.2).
      await this.probePostgres(),
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
