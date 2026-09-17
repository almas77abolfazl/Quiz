import { Injectable, OnModuleDestroy } from '@nestjs/common';

export type TimerType = 'deadline' | 'transition';

/**
 * MatchTimerService
 *
 * Single-instance MVP note:
 * This service manages in-memory NodeJS timers (setTimeout) keyed by matchId, round number, and timer type.
 * For multi-instance production deployments, this in-memory scheduling must be replaced with
 * a distributed task scheduler (e.g. Redis + BullMQ) with distributed locking (e.g. Redlock) to ensure
 * timers are executed reliably across clustered NestJS instances.
 */
@Injectable()
export class MatchTimerService implements OnModuleDestroy {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  private makeKey(matchId: string, round: number, type: TimerType): string {
    return `${matchId}:${round}:${type}`;
  }

  scheduleDeadline(matchId: string, round: number, delayMs: number, callback: () => void): void {
    this.scheduleTimer(matchId, round, 'deadline', delayMs, callback);
  }

  scheduleTransition(matchId: string, round: number, delayMs: number, callback: () => void): void {
    this.scheduleTimer(matchId, round, 'transition', delayMs, callback);
  }

  scheduleTimer(
    matchId: string,
    round: number,
    type: TimerType,
    delayMs: number,
    callback: () => void,
  ): void {
    this.cancelTimer(matchId, round, type);
    const key = this.makeKey(matchId, round, type);

    const timer = setTimeout(() => {
      this.timers.delete(key);
      try {
        callback();
      } catch (err) {
        // Log unexpected timer execution errors silently in background timer thread
        console.error(`[MatchTimerService] Timer execution failed for ${key}:`, err);
      }
    }, delayMs);

    this.timers.set(key, timer);
  }

  cancelTimer(matchId: string, round: number, type: TimerType): void {
    const key = this.makeKey(matchId, round, type);
    const existing = this.timers.get(key);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(key);
    }
  }

  cancelAllTimersForMatch(matchId: string): void {
    const prefix = `${matchId}:`;
    for (const [key, timer] of this.timers.entries()) {
      if (key.startsWith(prefix)) {
        clearTimeout(timer);
        this.timers.delete(key);
      }
    }
  }

  clearAllTimers(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  onModuleDestroy(): void {
    this.clearAllTimers();
  }
}
