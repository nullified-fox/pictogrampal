import {InteractionEditReplyOptions, InteractionReplyOptions} from "discord.js";
import Boolean from "@/methods/Boolean";

export type InteractionReplyData =
    (InteractionReplyOptions | InteractionEditReplyOptions) & Partial<Record<"temporary", Boolean>>
    | string
    | null;

export type Result<T = undefined> =
    | { ok: false, message: string }
    | { ok: true } & (T extends undefined ? { data?: never } : { data: T });