# Use Deno official image
FROM denoland/deno:latest

# Set working directory
WORKDIR /app

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy source code first
COPY . .

# Cache dependencies
RUN deno cache --reload --allow-scripts main.ts

# Change ownership to non-root user
RUN chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8007

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8007/ || exit 1

# Start the application
CMD ["deno", "run", "-A", "main.ts"]