# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_BASE_URL=http://localhost:5000/api/v1
ARG VITE_PUBLIC_SITE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PUBLIC_SITE_URL=$VITE_PUBLIC_SITE_URL
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh \
    && chmod +x /docker-entrypoint.sh \
    && mkdir -p /seo-templates \
    && cp /usr/share/nginx/html/robots.txt /seo-templates/robots.txt \
    && cp /usr/share/nginx/html/sitemap.xml /seo-templates/sitemap.xml \
    && cp /usr/share/nginx/html/index.html /seo-templates/index.html
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
