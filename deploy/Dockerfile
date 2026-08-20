# ArtPack Studio 雲端映像。Build context = Artpack 資料夾（唔係 studio/）：
#   docker build -f studio/deploy/Dockerfile -t artpack-studio .
FROM node:20-slim

WORKDIR /app/studio
COPY studio/package*.json ./
RUN npm ci --omit=dev

COPY studio/ ./
RUN npm run build

# 素材庫種子（第一次起機 copy 落 /data volume，之後以 volume 為準）
WORKDIR /seed
COPY ["2D Casual Icons", "./2D Casual Icons/"]
COPY ["Building Pack", "./Building Pack/"]
COPY ["Character Pack (PNG)", "./Character Pack (PNG)/"]
COPY ["Reward Pack", "./Reward Pack/"]
COPY ["UI Pack", "./UI Pack/"]
COPY ["StarParts-Godot", "./StarParts-Godot/"]

WORKDIR /app/studio
ENV ARTPACK_ROOT=/data
ENV PORT=8080
EXPOSE 8080
COPY studio/deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
CMD ["/entrypoint.sh"]
