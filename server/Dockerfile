FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all project files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose the application port (assuming 3001 based on standard setup)
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
