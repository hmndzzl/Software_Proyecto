FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN mkdir -p media/espacios/subidas && chown node:node media/espacios/subidas
EXPOSE 3001
CMD ["npm", "run", "dev"]

FROM dev AS build
RUN npm run build

FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --chown=node:node media ./media
RUN mkdir -p media/espacios/subidas && chown node:node media/espacios/subidas
USER node
EXPOSE 3001
CMD ["npm", "start"]
