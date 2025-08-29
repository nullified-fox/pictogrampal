import { PrismaClient } from "@prisma/client";
import Logger from "@/utilities/logger";
import axios from "axios";

class DatabaseManager {
    // Private Static Properties
    private static instance: DatabaseManager;

    // Private Properties
    private readonly prisma: PrismaClient;
    private connectionPromise: Promise<void> | null = null;
    private status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' = 'DISCONNECTED';
    private reconnectInterval: NodeJS.Timeout | null = null;
    private notificationSent: boolean = false;

    // Constructor
    private constructor() {
        this.prisma = new PrismaClient();
    }

    // Public Static Methods
    public static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }

    // Public Methods
    public getPrismaClient(): PrismaClient {
        return this.prisma;
    }

    public async connect(): Promise<void> {
        if (!this.connectionPromise) {
            this.connectionPromise = this.internalConnect();
        }
        return this.connectionPromise;
    }

    public async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
        Logger.log("SETUP", "Successfully disconnected from the database.", { context: "DatabaseManager" });
    }

    // Private Methods
    private async internalConnect(): Promise<void> {
        this.status = 'CONNECTING';
        try {
            await this.prisma.$connect();
            this.status = 'CONNECTED';
            Logger.log("SETUP", "Successfully connected to the database.", { completed: true, context: "DatabaseManager" });
            if (this.reconnectInterval) {
                clearInterval(this.reconnectInterval);
                this.reconnectInterval = null;
            }
            if (!this.notificationSent) {
                this.sendWebhookNotification(true);
                this.notificationSent = false;
            }
        } catch (error) {
            this.status = 'DISCONNECTED';
            Logger.error(`Failed to connect to the database: ${error}`, "DatabaseManager");
            if (!this.reconnectInterval) {
                this.startReconnecting();
            }
            if (!this.notificationSent) {
                this.sendWebhookNotification(false, error instanceof Error ? error : undefined);
                this.notificationSent = true;
            }
            throw error;
        }
    }

    private sendWebhookNotification(isOnline: boolean, error?: Error) {
        const webhookUrl = process.env.DEV_WEBHOOK_URL;
        if (!webhookUrl) {
            Logger.warn("DEV_WEBHOOK_URL not set, skipping notification.", "DatabaseManager");
            return;
        }

        const embed = {
            title: isOnline ? "Database Connection Restored" : "Database Connection Lost",
            description: isOnline ? "The connection to the database has been successfully restored." : `The bot lost connection to the database. It will attempt to reconnect automatically.\n\n**Error:**\n\`\`\`${error?.message ?? "Unknown error"}\`\`\``,
            color: isOnline ? 0x00ff00 : 0xff0000,
            timestamp: new Date().toISOString(),
            footer: {
                text: "Database Status"
            }
        };

        axios.post(webhookUrl, {
            username: "Prisma Database",
            embeds: [embed]
        }).catch(err => {
            Logger.error(`Failed to send webhook notification: ${err}`, "DatabaseManager");
        });
    }

    private startReconnecting() {
        if (this.reconnectInterval) return;
        Logger.log("INFO", "Attempting to reconnect to the database every minute...", { context: "DatabaseManager" });
        // @ts-ignore
        this.reconnectInterval = setInterval(async () => {
            Logger.log("INFO", "Attempting to reconnect to the database...", { context: "DatabaseManager" });
            try {
                await this.internalConnect();
            } catch (error) {
                // internalConnect already logs the error
            }
        }, 60 * 1000);
    }
}

export default DatabaseManager.getInstance();
