import { Injectable } from '@nestjs/common';

/**
 * MatchPresenceService
 *
 * Single-instance MVP note:
 * This service manages in-memory WebSocket socket connections per user ID.
 * For multi-instance production deployments, presence state must be backed by a distributed
 * data store (e.g. Redis hash/sets) with Pub/Sub events for node-to-node presence broadcasts.
 */
@Injectable()
export class MatchPresenceService {
  private readonly userSockets = new Map<string, Set<string>>();

  addSocket(userId: string, socketId: string): { isFirstSocket: boolean } {
    let socketSet = this.userSockets.get(userId);
    let isFirstSocket = false;

    if (!socketSet) {
      socketSet = new Set();
      this.userSockets.set(userId, socketSet);
      isFirstSocket = true;
    } else if (socketSet.size === 0) {
      isFirstSocket = true;
    }

    socketSet.add(socketId);
    return { isFirstSocket };
  }

  removeSocket(userId: string, socketId: string): { isLastSocket: boolean } {
    const socketSet = this.userSockets.get(userId);
    if (!socketSet) {
      return { isLastSocket: false };
    }

    socketSet.delete(socketId);
    if (socketSet.size === 0) {
      this.userSockets.delete(userId);
      return { isLastSocket: true };
    }

    return { isLastSocket: false };
  }

  isUserConnected(userId: string): boolean {
    const set = this.userSockets.get(userId);
    return !!set && set.size > 0;
  }

  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size ?? 0;
  }

  getUserSockets(userId: string): string[] {
    const set = this.userSockets.get(userId);
    return set ? Array.from(set) : [];
  }

  clear(): void {
    this.userSockets.clear();
  }
}
