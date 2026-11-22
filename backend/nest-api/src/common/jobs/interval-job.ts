// backend/nest-api/src/common/jobs/interval-job.ts
//
// Runs a task now and then every intervalMs, one run at a time (a tick that
// finds the previous run still going is skipped). stop() cancels the timer
// and waits for a run in progress, so shutdown never closes the database
// pool under it. A failing run is logged and does not stop the job.

import type { Logger } from '@nestjs/common';

export class IntervalJob {
  private timer: NodeJS.Timeout | undefined;
  private current: Promise<void> | undefined;

  constructor(
    private readonly options: {
      description: string;
      intervalMs: number;
      logger: Logger;
      run: () => Promise<void>;
    },
  ) {}

  start(): void {
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.options.intervalMs);
    // Never keep the process alive just for this timer.
    this.timer.unref();
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    await this.current;
  }

  private tick(): Promise<void> {
    if (!this.current) {
      this.current = this.runSafely().finally(() => {
        this.current = undefined;
      });
    }
    return this.current;
  }

  private async runSafely(): Promise<void> {
    try {
      await this.options.run();
    } catch (error) {
      this.options.logger.error(
        `Failed to ${this.options.description}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
