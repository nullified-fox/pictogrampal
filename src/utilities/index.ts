import {CronJob, CronJobParams} from "cron";
import {cron} from "@sentry/bun";
import Logger from "@/utilities/logger";
import DatabaseManager from "@/managers/database/DatabaseManager";
import process from "node:process";
import {DATE_DEFAULT_TIMEZONE} from "@/utilities/constants";

export * from "./string";

export async function startCleanupOperations(event: string) {
    Logger.log(event, "Starting cleanup operations...");

    try {
        await DatabaseManager.disconnect();
    } catch (error) {
        Logger.log(event, `Cleanup operations failed: ${error}`, {
            completed: true
        });
        return;
    }

    Logger.log(event, "Cleanup operations completed", {completed: true});

    process.exit(0);
}