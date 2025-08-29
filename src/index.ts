import {ShardingManager} from 'discord.js';
import path from 'path';
import Logger from '@/utilities/logger';

if (!process.env.BOT_TOKEN) {
    Logger.error("No token provided! Configure the BOT_TOKEN environment variable.");
    throw new Error("No token provided! Configure the BOT_TOKEN environment variable.");
}

const manager = new ShardingManager(path.resolve('src/client.ts'), {
    token: process.env.BOT_TOKEN,
    totalShards: 'auto',
});

manager.on('shardCreate', shard => {
    Logger.log("SETUP", `Launched shard #${shard.id}`, {context: "ShardingManager"});
});

manager.spawn().catch(error => {
    Logger.error(`Failed to spawn shards: ${error.message}`, "ShardingManager");
    if (error instanceof Error) {
        Logger.error(error.stack ?? "No stack available", "ShardingManager");
    }
    process.exit(1);
});
