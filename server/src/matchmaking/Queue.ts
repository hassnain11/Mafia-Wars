import { MIN_PLAYERS } from '@mafia/shared';

export interface QueueEntry {
  socketId: string;
  name: string;
  joinedAt: number;
}

export class MatchQueue {
  private readonly entries: QueueEntry[] = [];

  size(): number {
    return this.entries.length;
  }

  needed(): number {
    return Math.max(0, MIN_PLAYERS - this.entries.length);
  }

  add(entry: QueueEntry): void {
    if (this.entries.some((e) => e.socketId === entry.socketId)) return;
    this.entries.push(entry);
  }

  removeBySocket(socketId: string): QueueEntry | undefined {
    const idx = this.entries.findIndex((e) => e.socketId === socketId);
    if (idx < 0) return undefined;
    return this.entries.splice(idx, 1)[0];
  }

  isNameTaken(name: string): boolean {
    const needle = name.trim().toLowerCase();
    return this.entries.some((e) => e.name.toLowerCase() === needle);
  }

  positionOf(socketId: string): number {
    return this.entries.findIndex((e) => e.socketId === socketId) + 1;
  }

  all(): readonly QueueEntry[] {
    return this.entries;
  }

  takeMatch(): QueueEntry[] | null {
    if (this.entries.length < MIN_PLAYERS) return null;
    return this.entries.splice(0, this.entries.length);
  }
}
