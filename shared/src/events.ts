// Socket.IO event names — single source of truth.
// Mirrors API_SPEC.md §2.

export const EV = {
  // Client → Server
  CREATE_LOBBY: 'c.createLobby',
  CREATE_BOT_LOBBY: 'c.createBotLobby',
  QUICK_MATCH: 'c.quickMatch',
  LEAVE_QUEUE: 'c.leaveQueue',
  JOIN_LOBBY: 'c.joinLobby',
  LEAVE_LOBBY: 'c.leaveLobby',
  UPDATE_SETTINGS: 'c.updateSettings',
  START_GAME: 'c.startGame',
  NIGHT_MAFIA_PICK: 'c.night.mafiaPick',
  NIGHT_DOCTOR_PICK: 'c.night.doctorPick',
  NIGHT_DETECTIVE_INVESTIGATE: 'c.night.detectiveInvestigate',
  CHAT_SEND: 'c.chatSend',
  CAST_VOTE: 'c.castVote',
  REQUEST_REBUTTAL: 'c.requestRebuttal',
  RELEASE_REBUTTAL: 'c.releaseRebuttal',
  RETURN_TO_LOBBY: 'c.returnToLobby',
  RECONNECT: 'c.reconnect',

  // Server → Client
  MATCH_FOUND: 's.matchFound',
  QUEUE_UPDATE: 's.queueUpdate',
  LOBBY_STATE: 's.lobbyState',
  SELF_VIEW: 's.selfView',
  PHASE_CHANGED: 's.phaseChanged',
  CHAT_MSG: 's.chatMsg',
  DAWN_ANNOUNCE: 's.dawnAnnounce',
  DETECTIVE_RESULT: 's.detectiveResult',
  VOTE_RESULT: 's.voteResult',
  GAME_ENDED: 's.gameEnded',
  ERROR: 's.error',
  TOAST: 's.toast',
} as const;

export type EventName = (typeof EV)[keyof typeof EV];
