FROM node:16-alpine

# 安装 nginx
RUN apk add --no-cache nginx

# 设置工作目录
WORKDIR /app

# 创建数据目录并设置权限
RUN mkdir -p /app/data && chown -R node:node /app/data

# 复制 package.json 和 package-lock.json
COPY package*.json ./
RUN npm install

# 复制项目文件
COPY . .

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 创建 nginx 日志目录
RUN mkdir -p /var/log/nginx

# 设置数据目录权限
RUN chown -R node:node /app/data

# 暴露端口
EXPOSE 8088 3000

# 创建启动脚本
COPY start.sh /start.sh
RUN chmod +x /start.sh

# 启动服务
CMD ["/start.sh"] 