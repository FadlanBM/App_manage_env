FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN npx prisma@6 generate
RUN npx prisma@6 db push --skip-generate

EXPOSE 3000

CMD ["node", "src/server.js"]
