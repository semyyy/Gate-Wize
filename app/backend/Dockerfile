FROM node:20-alpine

WORKDIR /app

# Install dependencies including those required for Puppeteer if needed, 
# though for alpine significant extra configuration is often required for Puppeteer.
# Keeping it simple as per plan.

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
