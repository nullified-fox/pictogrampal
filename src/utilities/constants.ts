import {Colors, GatewayIntentBits, MessageMentionOptions, Partials, PermissionFlagsBits} from "discord.js";
import Boolean from "@/structures/Boolean";

export const EXIT_EVENTS = ["SIGHUP", "SIGINT", "SIGQUIT", "SIGILL", "SIGTRAP", "SIGABRT", "SIGBUS", "SIGFPE", "SIGUSR1", "SIGSEGV", "SIGUSR2", "SIGTERM", "uncaughtException", "unhandledRejection"];

// =======================================================================================
// APPLICATION INTENTS AND PARTIALS
// =======================================================================================

export const APP_CLIENT_INTENTS: readonly GatewayIntentBits[] = [
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.Guilds
];

export const APP_CLIENT_PARTIALS: readonly Partials[] = [
    Partials.Message,
    Partials.Reaction
];

// =======================================================================================
// TIMEZONE CONSTANTS
// =======================================================================================

export const DATE_DEFAULT_TIMEZONE = "UTC";

// =======================================================================================
// discord CONSTANTS
// =======================================================================================

export const CLIENT_DEFAULT_COMMAND_PERMISSIONS: readonly bigint[] = [PermissionFlagsBits.ManageGuild];
export const CLIENT_DEFAULT_DM_PERMISSIONS: Boolean = new Boolean(true);

// =======================================================================================
// MISC
// =======================================================================================

export const THEMES = [
  "Movies",
  "Animals",
  "Food",
  "Countries",
  "Sports",
  "Famous People",
  "Household Objects",
  "Video Games",
  "Mythology",
  "Science",
  "History",
  "Music",
  "Literature",
  "Art",
  "Space",
];