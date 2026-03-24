FROM node:22-bookworm-slim

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm install --omit=dev

COPY frontend ./

EXPOSE 3000

CMD ["npm", "run", "dev"]
