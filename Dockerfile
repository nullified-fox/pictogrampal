# Use the official Bun image as a base image
FROM oven/bun:latest

# Set the working directory
WORKDIR /usr/src/app

# This ARG is used during the build process (e.g., for `prisma generate`)
ARG DATABASE_URL
# This ENV makes the variable available at runtime for the application
ENV DATABASE_URL=${DATABASE_URL}

# Copy configuration files
COPY package.json tsconfig.json ./

# Install production dependencies.
RUN bun install --production

# Copy the rest of the application code
COPY . .

# Generate prisma client
RUN bunx prisma generate

# The command to run the bot
CMD ["bun", "run", "start"]
