# Use the official Node.js image (Linux)
FROM node:18-slim

# 1. Install Tesseract OCR and required system libraries
# (This fixes the "tesseract not installed" error)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    ghostscript \
    graphicsmagick \
    && rm -rf /var/lib/apt/lists/*

# 2. Set the working directory inside the server
WORKDIR /app

# 3. Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy the rest of the Backend code
COPY . .

# 5. Expose the port (Render uses 10000)
EXPOSE 10000

# 6. Start the server
CMD ["node", "app.js"]