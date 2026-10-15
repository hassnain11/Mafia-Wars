import { LOBBY_CODE_ALPHABET, LOBBY_CODE_LENGTH } from '@mafia/shared';

export function generateCode(length = LOBBY_CODE_LENGTH): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * LOBBY_CODE_ALPHABET.length);
    out += LOBBY_CODE_ALPHABET[idx];
  }
  return out;
}

export function generateUniqueCode(exists: (code: string) => boolean): string {
  for (let i = 0; i < 50; i++) {
    const code = generateCode();
    if (!exists(code)) return code;
  }
  throw new Error('Could not generate a unique lobby code after 50 attempts');
}
