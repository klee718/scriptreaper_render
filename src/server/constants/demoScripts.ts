export interface DemoScript {
  id: string;
  label: string;
  title: string;
  script: string;
}

export const demoScripts: DemoScript[] = [
  {
    id: "deploy",
    label: "🚀 Deploy Script",
    title: "Production Deploy Script",
    script: `#!/bin/bash
# Production deployment script
# DO NOT RUN MANUALLY — triggered by CI

set -e

ENVIRONMENT=\${1:-staging}
SERVICE_NAME="api-service"
HEALTH_URL="https://\${SERVICE_NAME}.mycompany.com/health"

echo "Starting deployment to \${ENVIRONMENT}..."

# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Build the application
npm run build

# Run database migrations
NODE_ENV=\${ENVIRONMENT} npm run db:migrate

# Restart the service
pm2 restart \${SERVICE_NAME} || pm2 start dist/server.js --name \${SERVICE_NAME}

# Wait for service to come up
echo "Waiting for service..."
sleep 30

# Health check with retry
MAX_RETRIES=5
RETRY_COUNT=0
until curl -sf "\${HEALTH_URL}"; do
  RETRY_COUNT=\$((RETRY_COUNT + 1))
  if [ \$RETRY_COUNT -ge \$MAX_RETRIES ]; then
    echo "Health check failed after \${MAX_RETRIES} attempts"
    # Notify on failure
    curl -X POST "\$SLACK_WEBHOOK" \\
      -H 'Content-Type: application/json' \\
      -d "{\\"text\\":\\"❌ Deployment FAILED for \${SERVICE_NAME} in \${ENVIRONMENT}\\"}"
    exit 1
  fi
  sleep 10
done

echo "Deployment successful!"
curl -X POST "\$SLACK_WEBHOOK" \\
  -H 'Content-Type: application/json' \\
  -d "{\\"text\\":\\"✅ Deployment succeeded for \${SERVICE_NAME} in \${ENVIRONMENT}\\"}"`,
  },
  {
    id: "backup",
    label: "🗄️ Backup Script",
    title: "Database Backup Script",
    script: `#!/bin/bash
# Daily database backup — runs at 2:00 AM via cron
# 0 2 * * * /opt/scripts/backup.sh >> /var/log/backup.log 2>&1

set -e

TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
DB_NAME="production_db"
BACKUP_DIR="/tmp/backups"
S3_BUCKET="s3://mycompany-backups/postgres"
RETAIN_DAYS=30

echo "[\${TIMESTAMP}] Starting backup of \${DB_NAME}"

# Create backup directory
mkdir -p \${BACKUP_DIR}

# Dump and compress
pg_dump \${DB_NAME} | gzip > \${BACKUP_DIR}/\${DB_NAME}_\${TIMESTAMP}.sql.gz

# Upload to S3
aws s3 cp \${BACKUP_DIR}/\${DB_NAME}_\${TIMESTAMP}.sql.gz \${S3_BUCKET}/\${TIMESTAMP}/

# Verify upload
aws s3 ls \${S3_BUCKET}/\${TIMESTAMP}/ | grep \${DB_NAME} || (echo "Upload verification failed" && exit 1)

# Cleanup local temp files
find \${BACKUP_DIR} -name "*.sql.gz" -mtime +1 -delete

# Prune old S3 backups older than RETAIN_DAYS
aws s3 ls \${S3_BUCKET}/ | awk '{print \$2}' | sort | head -n -\${RETAIN_DAYS} | \\
  xargs -I{} aws s3 rm \${S3_BUCKET}/{} --recursive

echo "[\${TIMESTAMP}] Backup complete. Size: \$(du -sh \${BACKUP_DIR}/\${DB_NAME}_\${TIMESTAMP}.sql.gz | cut -f1)"`,
  },
  {
    id: "health",
    label: "🩺 Health Check",
    title: "System Health Check Monitor",
    script: `#!/bin/bash
# Continuous health monitor — runs every 5 minutes
# */5 * * * * /opt/scripts/health-check.sh

SERVICES=(
  "api-service:https://api.mycompany.com/health"
  "auth-service:https://auth.mycompany.com/health"
  "worker-service:https://worker.mycompany.com/health"
)

PAGERDUTY_KEY="\${PAGERDUTY_ROUTING_KEY}"
SLACK_WEBHOOK="\${HEALTH_SLACK_WEBHOOK}"

check_service() {
  local name=\$1
  local url=\$2
  local response
  local http_code

  http_code=\$(curl -o /dev/null -s -w "%{http_code}" --max-time 10 "\${url}")

  if [ "\${http_code}" != "200" ]; then
    echo "CRITICAL: \${name} returned HTTP \${http_code}"
    
    # Fire PagerDuty alert
    curl -X POST https://events.pagerduty.com/v2/enqueue \\
      -H 'Content-Type: application/json' \\
      -d "{
        \\"routing_key\\": \\"\${PAGERDUTY_KEY}\\",
        \\"event_action\\": \\"trigger\\",
        \\"payload\\": {
          \\"summary\\": \\"\${name} health check failed (HTTP \${http_code})\\",
          \\"severity\\": \\"critical\\",
          \\"source\\": \\"health-check-script\\"
        }
      }"
    return 1
  fi
  
  echo "OK: \${name} (HTTP \${http_code})"
  return 0
}

FAILED=0
for service_entry in "\${SERVICES[@]}"; do
  IFS=':' read -r name url <<< "\${service_entry}"
  check_service "\${name}" "\${url}" || FAILED=\$((FAILED + 1))
done

if [ \$FAILED -gt 0 ]; then
  curl -X POST "\${SLACK_WEBHOOK}" \\
    -H 'Content-Type: application/json' \\
    -d "{\\"text\\":\\"🚨 \${FAILED} service(s) failing health checks. PagerDuty alerted.\\"}"
  exit 1
fi

echo "All services healthy."`,
  },
];
