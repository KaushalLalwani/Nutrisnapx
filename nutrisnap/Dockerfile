# 1. Use the official Microsoft Playwright image (has Python + Chromium OS dependencies ready)
FROM mcr.microsoft.com/playwright/python:v1.49.0-noble

# 2. Set working directory inside container
WORKDIR /app

# 3. Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Install the Chromium browser binary
RUN playwright install chromium

# 5. Copy the rest of the backend code
COPY . .

# 6. Expose default port (Render provides $PORT at runtime)
ENV PORT=10000
EXPOSE 10000

# 7. Start FastAPI with Uvicorn
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]