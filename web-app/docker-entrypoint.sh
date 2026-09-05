#!/bin/sh
set -e
SITE_URL="${PUBLIC_SITE_URL:-http://localhost:3000}"
SITE_URL="${SITE_URL%/}"
cp /seo-templates/robots.txt /usr/share/nginx/html/robots.txt
cp /seo-templates/sitemap.xml /usr/share/nginx/html/sitemap.xml
cp /seo-templates/index.html /usr/share/nginx/html/index.html
sed -i "s|__SITE_URL__|${SITE_URL}|g" /usr/share/nginx/html/robots.txt /usr/share/nginx/html/sitemap.xml /usr/share/nginx/html/index.html
exec nginx -g 'daemon off;'
