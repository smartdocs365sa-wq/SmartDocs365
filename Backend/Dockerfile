# Use Node.js 18 on Debian (Linux)
FROM node:18-slim

# 1. Install System Dependencies (Tesseract OCR & Python)
# We need python3 and pip because your app uses a Python script for extraction
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    python3 \
    python3-pip \
    ghostscript \
    graphicsmagick \
    && rm -rf /var/lib/apt/lists/*

# 2. Set working directory
WORKDIR /app

# 3. Install Python Dependencies (for extract_policy.py)
COPY requirements.txt ./
# Use --break-system-packages to allow installing globally in the container
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# 4. Install Node Dependencies
COPY package*.json ./
RUN npm install

# 5. Copy the rest of the application code
COPY . .

# 6. Expose the port (Render uses 10000 by default, or your PORT env var)
EXPOSE 10000

# 7. Start the application
CMD ["node", "app.js"]