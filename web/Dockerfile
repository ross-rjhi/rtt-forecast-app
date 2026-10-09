# Web front end: build the Vue app, then serve the static files with nginx. On Azure, the build
# output (dist/) would go to Static Web Apps instead; nginx.conf mimics what SWA does.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
