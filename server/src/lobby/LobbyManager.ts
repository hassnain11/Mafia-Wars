import { Lobby } from './Lobby.js';
import { generateUniqueCode } from './codeGen.js';

export class LobbyManager {
  private readonly byCode = new Map<string, Lobby>();

  create(): Lobby {
    const code = generateUniqueCode((c) => this.byCode.has(c));
    const lobby = new Lobby(code);
    this.byCode.set(code, lobby);
    return lobby;
  }

  get(code: string): Lobby | undefined {
    return this.byCode.get(code.toUpperCase());
  }

  remove(code: string): void {
    this.byCode.delete(code.toUpperCase());
  }

  findBySocket(socketId: string): Lobby | undefined {
    for (const lobby of this.byCode.values()) {
      if (lobby.getPlayerBySocket(socketId)) return lobby;
    }
    return undefined;
  }

  size(): number {
    return this.byCode.size;
  }
}
