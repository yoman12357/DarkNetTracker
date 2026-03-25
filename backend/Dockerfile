FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 tshark \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm install --omit=dev

COPY backend /workspace/backend
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

EXPOSE 4000

CMD ["node", "server.js"]
