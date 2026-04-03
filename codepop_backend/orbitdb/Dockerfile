FROM node:20-slim

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends build-essential python3 \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install

COPY . .

ENV PORT=3001
ENV LIBP2P_PORT=4001

EXPOSE 3001 4001

CMD ["node", "peer-node.js"]
