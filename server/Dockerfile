FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Prisma schema before npm ci
COPY prisma ./prisma

# Install dependencies and generate Prisma Client
RUN npm ci

# Copy remaining application files
COPY . .

EXPOSE 3001

CMD ["npm", "start"]