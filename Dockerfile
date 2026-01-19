# Use official Node.js 18 image
FROM node:18-slim

# Install system dependencies including Tesseract OCR
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    libtesseract-dev \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app/Backend

# Copy package files
COPY Backend/package*.json ./
COPY Backend/requirements.txt ./

# Install Python dependencies (bypass system package restriction)
RUN pip3 install --break-system-packages --no-cache-dir -r requirements.txt

# Install Node dependencies
RUN npm install --production

# Copy application code
COPY Backend/ ./

# Expose port
EXPOSE 3033

# Start the application
CMD ["node", "app.js"]