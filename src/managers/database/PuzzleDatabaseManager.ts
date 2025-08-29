import { DailyPuzzle, Prisma, User, UserPuzzlePlay } from "@prisma/client";
import DatabaseManager from "@/managers/database/DatabaseManager";

type PuzzleData = {
    theme: string;
    emojis: string;
    answer: string;
};

export default class PuzzleDatabaseManager {
    // Public static methods
    public static async getOrCreateUser(userId: string, username: string): Promise<User> {
        const prisma = DatabaseManager.getPrismaClient();
        let user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    id: userId,
                    username: username,
                },
            });
        }

        return user;
    }

    public static async getTodayPuzzle(): Promise<DailyPuzzle | null> {
        const prisma = DatabaseManager.getPrismaClient();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return prisma.dailyPuzzle.findFirst({
            where: {
                date: today,
            },
        });
    }

    public static async createPuzzle(puzzleData: PuzzleData): Promise<DailyPuzzle> {
        const prisma = DatabaseManager.getPrismaClient();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return prisma.dailyPuzzle.create({
            data: {
                date: today,
                theme: puzzleData.theme,
                emojis: puzzleData.emojis,
                thing: puzzleData.answer,
            },
        });
    }

    public static async getUserPlay(userId: string, puzzleId: number): Promise<UserPuzzlePlay | null> {
        const prisma = DatabaseManager.getPrismaClient();
        return prisma.userPuzzlePlay.findUnique({
            where: {
                userId_puzzleId: {
                    userId,
                    puzzleId,
                },
            },
        });
    }

    public static async createUserPlay(userId: string, puzzleId: number): Promise<UserPuzzlePlay> {
        const prisma = DatabaseManager.getPrismaClient();
        return prisma.userPuzzlePlay.create({
            data: {
                userId,
                puzzleId,
            },
        });
    }

    public static async updateUserPlay(playId: number, data: Prisma.UserPuzzlePlayUpdateInput): Promise<UserPuzzlePlay> {
        const prisma = DatabaseManager.getPrismaClient();

        return prisma.userPuzzlePlay.update({
            where: { id: playId },
            data,
        });
    }

    public static async incrementUserStreak(userId: string): Promise<User> {
        const prisma = DatabaseManager.getPrismaClient();
        return prisma.user.update({
            where: { id: userId },
            data: {
                streak: {
                    increment: 1,
                },
            },
        });
    }

    public static async clearUserStreak(userId: string): Promise<User> {
        const prisma = DatabaseManager.getPrismaClient();
        return prisma.user.update({
            where: { id: userId },
            data: {
                streak: {
                    set: 0,
                },
            },
        });
    }

    public static async incrementUserScore(userId: string, amount: number): Promise<User> {
        const prisma = DatabaseManager.getPrismaClient();
        return prisma.user.update({
            where: { id: userId },
            data: {
                score: {
                    increment: amount,
                },
            },
        });
    }

    public static async decrementUserScore(userId: string, amount: number): Promise<User> {
        const prisma = DatabaseManager.getPrismaClient();
        return prisma.user.update({
            where: { id: userId },
            data: {
                score: {
                    decrement: amount,
                },
            },
        });
    }

    public static async getHintsAllowed(): Promise<number> {
        const prisma = DatabaseManager.getPrismaClient();
        const config = await prisma.config.findFirst();
        return config?.hintsAllowed ?? 3;
    }
}
