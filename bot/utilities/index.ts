import {CronJob, CronJobParams} from "cron";
import {cron} from "@sentry/bun";
import Logger from "@/utilities/logger";
import DatabaseManager from "@/managers/database/DatabaseManager";
import process from "node:process";
import {DATE_DEFAULT_TIMEZONE} from "@/utilities/constants";

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
    return count === 1 ? singular : plural;
}

export async function startCleanupOperations(event: string) {
    Logger.log(event, "Starting cleanup operations...");

    try {
        await terminatePrisma();
    } catch (error) {
        Logger.log(event, `Cleanup operations failed: ${error}`, {
            completed: true
        });
        return;
    }

    Logger.log(event, "Cleanup operations completed", {completed: true});

    process.exit(0);
}

async function terminatePrisma() {
    Logger.info(`Terminating database connection...`)
    await DatabaseManager.disconnect();
}

export function startCronJob(monitorSlug: string, cronTime: CronJobParams["cronTime"], onTick: () => Promise<void> | void): void {
    const cronJobWithCheckIn = cron.instrumentCron(CronJob, monitorSlug);

    console.log(``)

    cronJobWithCheckIn.from({
        cronTime,
        timeZone: DATE_DEFAULT_TIMEZONE,
        onTick: async () => {
            Logger.log(monitorSlug, `RUN => Processing scheduled job...`)
            await onTick();
            Logger.log(monitorSlug, `RUN => Scheduled job completed...`)
        }
    }).start();

    Logger.log("SYSTEM_UTILITIES_SCHEDULED_JOBS", `Scheduled job registered: ${monitorSlug}`)
}

export function parseIdString(idString: string | null | undefined): string[] {
    if (!idString) return [];
    return idString.split(', ').map(id => id.trim()).filter(id => /^\d{17,19}$/.test(id));
}