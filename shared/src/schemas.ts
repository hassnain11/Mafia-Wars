// zod schemas for every client-sent socket payload.
// Mirrors API_SPEC.md §3.

import { z } from 'zod';
import {
  NAME_MIN,
  NAME_MAX,
  NAME_PATTERN,
  LOBBY_CODE_LENGTH,
  CHAT_MAX,
  MAFIA_COUNT_MIN,
  DISCUSSION_SECONDS_MIN,
  DISCUSSION_SECONDS_MAX,
  VOTING_SECONDS_MIN,
  VOTING_SECONDS_MAX,
  NIGHT_SECONDS_MIN,
  NIGHT_SECONDS_MAX,
  SETTINGS_SECONDS_STEP,
} from './constants.js';

const stepRefine = (step: number) => (n: number) => n % step === 0;
const stepMsg = (step: number) => `must be a multiple of ${step}`;

export const NameSchema = z
  .string()
  .trim()
  .min(NAME_MIN)
  .max(NAME_MAX)
  .regex(NAME_PATTERN, 'name has invalid characters');

export const LobbyCodeSchema = z
  .string()
  .trim()
  .length(LOBBY_CODE_LENGTH)
  .transform((s) => s.toUpperCase());

export const PlayerIdSchema = z.string().min(1).max(64);

export const CreateLobbySchema = z.object({ name: NameSchema });
export type CreateLobbyPayload = z.infer<typeof CreateLobbySchema>;

export const CreateBotLobbySchema = z.object({
  name: NameSchema,
  botCount: z.number().int().min(4).max(11).optional(),
});
export type CreateBotLobbyPayload = z.infer<typeof CreateBotLobbySchema>;

export const QuickMatchSchema = z.object({ name: NameSchema });
export type QuickMatchPayload = z.infer<typeof QuickMatchSchema>;

export const LeaveQueueSchema = z.object({}).strict();
export type LeaveQueuePayload = z.infer<typeof LeaveQueueSchema>;

export const JoinLobbySchema = z.object({ name: NameSchema, code: LobbyCodeSchema });
export type JoinLobbyPayload = z.infer<typeof JoinLobbySchema>;

export const LeaveLobbySchema = z.object({}).strict();
export type LeaveLobbyPayload = z.infer<typeof LeaveLobbySchema>;

export const SettingsSchema = z.object({
  mafiaCount: z.number().int().min(MAFIA_COUNT_MIN),
  doctorEnabled: z.boolean(),
  detectiveEnabled: z.boolean(),
  discussionSeconds: z
    .number()
    .int()
    .min(DISCUSSION_SECONDS_MIN)
    .max(DISCUSSION_SECONDS_MAX)
    .refine(stepRefine(SETTINGS_SECONDS_STEP), { message: stepMsg(SETTINGS_SECONDS_STEP) }),
  votingSeconds: z
    .number()
    .int()
    .min(VOTING_SECONDS_MIN)
    .max(VOTING_SECONDS_MAX)
    .refine(stepRefine(SETTINGS_SECONDS_STEP), { message: stepMsg(SETTINGS_SECONDS_STEP) }),
  nightSeconds: z
    .number()
    .int()
    .min(NIGHT_SECONDS_MIN)
    .max(NIGHT_SECONDS_MAX)
    .refine(stepRefine(SETTINGS_SECONDS_STEP), { message: stepMsg(SETTINGS_SECONDS_STEP) }),
  voiceEnabled: z.boolean(),
});

export const UpdateSettingsSchema = SettingsSchema.partial();
export type UpdateSettingsPayload = z.infer<typeof UpdateSettingsSchema>;

export const StartGameSchema = z.object({}).strict();

export const NightMafiaPickSchema = z.object({ targetId: PlayerIdSchema });
export type NightMafiaPickPayload = z.infer<typeof NightMafiaPickSchema>;

export const NightDoctorPickSchema = z.object({ targetId: PlayerIdSchema });
export type NightDoctorPickPayload = z.infer<typeof NightDoctorPickSchema>;

export const NightDetectiveInvestigateSchema = z.object({ targetId: PlayerIdSchema });
export type NightDetectiveInvestigatePayload = z.infer<typeof NightDetectiveInvestigateSchema>;

export const ChatSendSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1)
    .max(CHAT_MAX)
    .refine((t) => !/[\r\n]/.test(t), { message: 'no newlines allowed' }),
});
export type ChatSendPayload = z.infer<typeof ChatSendSchema>;

export const CastVoteSchema = z.object({
  targetId: z.union([PlayerIdSchema, z.literal('skip')]),
});
export type CastVotePayload = z.infer<typeof CastVoteSchema>;

export const RequestRebuttalSchema = z.object({}).strict();
export const ReleaseRebuttalSchema = z.object({}).strict();

export const ReturnToLobbySchema = z.object({}).strict();

export const ReconnectSchema = z.object({
  playerId: PlayerIdSchema,
  code: LobbyCodeSchema,
});
export type ReconnectPayload = z.infer<typeof ReconnectSchema>;
