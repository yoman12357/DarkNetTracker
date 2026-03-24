FROM node:22-bookworm-slim

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm install --omit=dev

COPY backend ./
COPY engine_api.py /workspace/engine_api.py
COPY service.py /workspace/service.py
COPY main.py /workspace/main.py
COPY config.py /workspace/config.py
COPY models.py /workspace/models.py
COPY capture /workspace/capture
COPY processing /workspace/processing
COPY data /workspace/data
COPY ui /workspace/ui
COPY utils /workspace/utils

WORKDIR /workspace

EXPOSE 4000

CMD ["node", "/app/server.js"]
