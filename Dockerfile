FROM node:20-alpine
WORKDIR /app

# 高德地图 Key（构建时注入）
ARG AMAP_KEY=""
ARG AMAP_SECURITY_CODE=""
ENV AMAP_KEY=${AMAP_KEY}
ENV AMAP_SECURITY_CODE=${AMAP_SECURITY_CODE}

# 安装依赖
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# 复制源码
COPY . .

# 创建数据目录
RUN mkdir -p data uploads

EXPOSE 3001

CMD ["node", "server.js"]
