import type pg from 'pg';
import { pool } from '../db/pool';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { onJobFailedPermanently, runJob } from './handlers';
import { claimNextJob, JOBS_CHANNEL, markJobFailed, markJobSucceeded, recoverStaleJobs, type JobRow } from './queue';

const POLL_INTERVAL_MS = 5_000;
const RECOVERY_INTERVAL_MS = 60_000;

/**
 * Processes AI generation jobs from the `jobs` table.
 * Wakes instantly on NOTIFY, falls back to polling, and safely runs alongside other worker processes.
 */
export class JobWorker {
  private running = 0;
  private filling = false;
  private stopped = true;
  private listener: pg.PoolClient | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private recoveryTimer: NodeJS.Timeout | null = null;
  private readonly abort = new AbortController();
  private readonly inFlight = new Set<Promise<void>>();

  constructor(private readonly concurrency: number) {}

  async start(): Promise<void> {
    this.stopped = false;
    await this.listen();
    this.pollTimer = setInterval(() => void this.fill(), POLL_INTERVAL_MS);
    this.recoveryTimer = setInterval(() => void this.recover(), RECOVERY_INTERVAL_MS);
    await this.recover();
    void this.fill();
    logger.info({ concurrency: this.concurrency }, 'Job worker started');
  }

  private async listen(): Promise<void> {
    try {
      this.listener = await pool.connect();
      this.listener.on('notification', () => void this.fill());
      this.listener.on('error', (err) => {
        logger.warn({ err }, 'Job listener connection lost; relying on polling until reconnect');
        this.listener?.release(true);
        this.listener = null;
        if (!this.stopped) setTimeout(() => void this.listen(), POLL_INTERVAL_MS);
      });
      await this.listener.query(`LISTEN ${JOBS_CHANNEL}`);
    } catch (err) {
      logger.warn({ err }, 'Could not LISTEN for jobs; polling only');
      this.listener?.release(true);
      this.listener = null;
    }
  }

  private async recover(): Promise<void> {
    try {
      const n = await recoverStaleJobs();
      if (n) logger.warn({ count: n }, 'Re-queued stale jobs');
    } catch (err) {
      logger.error({ err }, 'Stale job recovery failed');
    }
  }

  /** Claim jobs until all concurrency slots are busy or the queue is empty. */
  private async fill(): Promise<void> {
    if (this.filling || this.stopped) return;
    this.filling = true;
    try {
      while (!this.stopped && this.running < this.concurrency) {
        const job = await claimNextJob();
        if (!job) break;
        this.running++;
        const task: Promise<void> = this.execute(job).finally(() => {
          this.running--;
          this.inFlight.delete(task);
          void this.fill();
        });
        this.inFlight.add(task);
      }
    } catch (err) {
      logger.error({ err }, 'Failed to claim jobs');
    } finally {
      this.filling = false;
    }
  }

  private async execute(job: JobRow): Promise<void> {
    const log = logger.child({ jobId: job.id, kind: job.kind, attempt: job.attempts });
    log.info('Job started');
    try {
      const resultId = await runJob(job, this.abort.signal);
      await markJobSucceeded(job.id, resultId);
    } catch (err) {
      const appErr = err instanceof AppError ? err : null;
      const message = appErr?.message ?? 'Generation failed unexpectedly. Please try again.';
      const retryable = appErr ? appErr.retryable : true;
      log.error({ err }, 'Job failed');
      const willRetry = await markJobFailed(job, message, retryable);
      if (!willRetry) await onJobFailedPermanently(job, message);
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.recoveryTimer) clearInterval(this.recoveryTimer);
    if (this.listener) {
      await this.listener.query(`UNLISTEN ${JOBS_CHANNEL}`).catch(() => undefined);
      this.listener.release();
      this.listener = null;
    }
    // Give in-flight jobs a grace period, then abort; leases let another worker pick them up.
    const grace = new Promise((resolve) => setTimeout(resolve, 20_000));
    await Promise.race([Promise.allSettled([...this.inFlight]), grace]);
    this.abort.abort();
    logger.info('Job worker stopped');
  }
}
