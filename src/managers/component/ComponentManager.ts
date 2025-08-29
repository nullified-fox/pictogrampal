import {Collection} from "discord.js";
import Component, {ComponentInteraction, CustomID} from "@/managers/component/Component";
import {captureException} from "@sentry/bun";
import path from "path";
import fs from "fs";
import {InteractionReplyData} from "@/utilities/types";
import Logger from "@/utilities/logger";
import {pluralize} from "@/utilities";

export default class ComponentManager {
    // Private Static Properties
    private static readonly _cache = new Collection<CustomID, Component>;

    // Public Static Methods
    public static async cache(): Promise<void> {
        const dirpath = path.resolve("bot/interactions/components");

        Logger.log("SETUP", "Starting caching components...", {context: `Caching`})

        if (!fs.existsSync(dirpath)) {
            Logger.log("SETUP", "Ignoring components: Components directory not found.", {context: `Caching`})
            return;
        }

        const filenames = fs.readdirSync(dirpath);
        let count = 0;

        try {
            for (const filename of filenames) {
                const filepath = path.resolve(dirpath, filename);

                // Import and initiate the component
                const componentModule = await import(filepath);
                const componentClass = componentModule.default;
                const component = new componentClass();

                // Ensure the component is an instance of the Component class
                if (!(component instanceof Component)) {
                    continue;
                }

                // Cache the component
                ComponentManager._cache.set(component.customId, component);
                const parsedCustomId = ComponentManager.parseCustomId(component.customId);

                Logger.log("SETUP", `Cached ${parsedCustomId}`, {completed: false, context: `Caching`})
                count++;
            }
        } catch (error) {
            captureException(error);
        }

        Logger.log("SETUP", `Cached ${count} ${pluralize(count, "component")}`, {completed: true, context: `Caching`})
    }

    public static parseCustomId(customId: CustomID): string {
        if (typeof customId === "string") {
            return customId;
        }

        switch (true) {
            case "matches" in customId:
                return `matches(${customId.matches.toString()})`;
            case "startsWith" in customId:
                return `startsWith(${customId.startsWith})`;
            case "endsWith" in customId:
                return `endsWith(${customId.endsWith})`;
            case "includes" in customId:
                return `includes(${customId.includes})`;
            default:
                return "unknown";
        }
    }

    public static handle(interaction: ComponentInteraction): Promise<InteractionReplyData> | InteractionReplyData {
        // Retrieve the component's instance from cache by its custom ID
        Logger.log("INFO", `Handling component interaction with customId: \`${interaction.customId}\` - In guild: ${interaction.guildId}`, {context: `Interaction`});
        const component = ComponentManager._getComponent(interaction.customId);

        if (!component) {
            const parsedCustomId = ComponentManager.parseCustomId(interaction.customId);
            throw new Error(`Component "${parsedCustomId}" not found`);
        }

        return component.execute(interaction);
    }

    // Private Static Methods
    private static _getComponent(customId: string): Component | undefined {
        return ComponentManager._cache.find(component => {
            if (typeof component.customId === "string") {
                return component.customId === customId;
            }

            if ("matches" in component.customId) {
                return customId.match(component.customId.matches);
            }

            if ("startsWith" in component.customId) {
                return customId.startsWith(component.customId.startsWith);
            }

            if ("endsWith" in component.customId) {
                return customId.endsWith(component.customId.endsWith);
            }

            return customId.includes(component.customId.includes);
        });
    }
}