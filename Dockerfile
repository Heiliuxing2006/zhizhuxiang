FROM node:20-alpine
WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# 复制源码
COPY . .

# 创建数据目录
RUN mkdir -p data uploads

EXPOSE 3001

CMD ["node", "server.js"]
