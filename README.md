# Exporter Trigger
This service triggers export process from user's input.

# Usage
###  For local development
Clone the repository, hit `npm install` & `npm start`. Make sure you have your configurations set right. 
###  Docker
Build an image with the provided `Dockerfile`, then run it.

# Environment Variables
**Service Specific**
* JOB_MANAGER_URL
* JOB_MANAGER_EXPIRATION_TIME - amount of days from creation till this job is expired
* RASTER_CATALOG_MANAGER_URL
* WORKER_TYPES_TILES_JOB_TYPE - configuration for exporter job type
* WORKER_TYPES_TILES_TASK_TYPE - configuration for exporter task type

**HTTP Requests**
* HTTP_RETRY_ATTEMPTS
* HTTP_RETRY_DELAY
* HTTP_RETRY_SHOULD_RESET_TIMEOUT

**Telemetry**
* TELEMETRY_SERVICE_NAME
* TELEMETRY_HOST_NAME
* TELEMETRY_SERVICE_VERSION
* TELEMETRY_TRACING_ENABLED
* TELEMETRY_TRACING_URL
* TELEMETRY_METRICS_ENABLED
* TELEMETRY_METRICS_URL
* TELEMETRY_METRICS_INTERVAL

**Logging**
* LOG_LEVEL
* LOG_PRETTY_PRINT_ENABLED

**Server**
* SERVER_PORT
* REQUEST_PAYLOAD_LIMIT
* RESPONSE_COMPRESSION_ENABLED