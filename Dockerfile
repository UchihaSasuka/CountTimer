FROM nginx:alpine

# 复制 nginx 配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 直接复制静态文件到 nginx 目录
COPY . /usr/share/nginx/html

EXPOSE 8088

CMD ["nginx", "-g", "daemon off;"] 