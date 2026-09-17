import { Injectable } from '@nestjs/common';
import { Difficulty } from '@quiz/contracts';

export interface MatchmakingQueueEntry {
  userId: string;
  categoryId?: string;
  difficulty?: Difficulty;
  joinedAt: Date;
}

export interface IMatchmakingQueue {
  enqueue(entry: MatchmakingQueueEntry): Promise<boolean>;
  dequeue(userId: string): Promise<boolean>;
  isQueued(userId: string): Promise<boolean>;
  getEntry(userId: string): Promise<MatchmakingQueueEntry | null>;
  findAndRemoveCandidate(
    joiningUserId: string,
    categoryId?: string,
    difficulty?: Difficulty,
  ): Promise<MatchmakingQueueEntry | null>;
  getQueueSize(): Promise<number>;
  clear(): Promise<void>;
}

/**
 * In-memory matchmaking queue implementation for single-instance development environment.
 *
 * HORIZONTAL SCALING ARCHITECTURE NOTE:
 * For multi-instance horizontal scaling across a cluster of API nodes:
 * 1. Replace this in-memory queue with a Redis-backed queue implementation (e.g., using Redis ZSETs/Sets).
 * 2. Use distributed lock mechanisms (such as Redlock or atomic Redis Lua scripts) for concurrency safety.
 * 3. Configure Socket.IO Redis Adapter (@socket.io/redis-adapter) to synchronize socket rooms across instances.
 */
@Injectable()
export class MatchmakingQueue implements IMatchmakingQueue {
  private readonly queue: MatchmakingQueueEntry[] = [];
  private readonly userIndex = new Map<string, MatchmakingQueueEntry>();

  async enqueue(entry: MatchmakingQueueEntry): Promise<boolean> {
    if (this.userIndex.has(entry.userId)) {
      return false; // Idempotent: already queued
    }
    this.userIndex.set(entry.userId, entry);
    this.queue.push(entry);
    return true;
  }

  async dequeue(userId: string): Promise<boolean> {
    const entry = this.userIndex.get(userId);
    if (!entry) return false;

    this.userIndex.delete(userId);
    const index = this.queue.findIndex((e) => e.userId === userId);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
    return true;
  }

  async isQueued(userId: string): Promise<boolean> {
    return this.userIndex.has(userId);
  }

  async getEntry(userId: string): Promise<MatchmakingQueueEntry | null> {
    return this.userIndex.get(userId) ?? null;
  }

  async findAndRemoveCandidate(
    joiningUserId: string,
    categoryId?: string,
    difficulty?: Difficulty,
  ): Promise<MatchmakingQueueEntry | null> {
    const candidateIndex = this.queue.findIndex(
      (entry) =>
        entry.userId !== joiningUserId &&
        entry.categoryId === categoryId &&
        entry.difficulty === difficulty,
    );

    if (candidateIndex === -1) {
      return null;
    }

    const candidate = this.queue[candidateIndex];
    this.queue.splice(candidateIndex, 1);
    this.userIndex.delete(candidate.userId);
    return candidate;
  }

  async getQueueSize(): Promise<number> {
    return this.queue.length;
  }

  async clear(): Promise<void> {
    this.queue.length = 0;
    this.userIndex.clear();
  }
}
