# PixelVault — disposable dev/test image.
# Nothing is installed on the host; all Node tooling stays in the container.
FROM docker.io/node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
