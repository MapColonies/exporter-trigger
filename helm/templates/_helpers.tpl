{{/*
Expand the name of the chart.
*/}}
{{- define "exporter-trigger.name" -}}
{{- default .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "exporter-trigger.fullname" -}}
{{- $name := default .Chart.Name }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "exporter-trigger.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "exporter-trigger.labels" -}}
app.kubernetes.io/name: {{ include "exporter-trigger.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
helm.sh/chart: {{ include "exporter-trigger.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{ include "mclabels.labels" . }}
{{- end }}

{{/*
Returns the tag of the chart.
*/}}
{{- define "exporter-trigger.tag" -}}
{{- default (printf "v%s" .Chart.AppVersion) .Values.image.tag }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "exporter-trigger.selectorLabels" -}}
app.kubernetes.io/name: {{ include "exporter-trigger.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{ include "mclabels.selectorLabels" . }}
{{- end }}

{{/*
Returns the environment from global if exists or from the chart's values, defaults to development
*/}}
{{- define "exporter-trigger.environment" -}}
{{- if .Values.global.environment }}
    {{- .Values.global.environment -}}
{{- else -}}
    {{- .Values.environment | default "development" -}}
{{- end -}}
{{- end -}}

{{/*
Returns the cloud provider image pull secret name from global if exists or from the chart's values
*/}}
{{- define "exporter-trigger.cloudProviderImagePullSecretName" -}}
{{- if .Values.global.cloudProvider.imagePullSecretName }}
    {{- .Values.global.cloudProvider.imagePullSecretName -}}
{{- else if .Values.cloudProvider -}}
    {{- .Values.cloudProvider.imagePullSecretName -}}
{{- end -}}
{{- end -}}

{{/*
Returns the cloud provider name from global if exists or from the chart's values, defaults to minikube
*/}}
{{- define "exporter-trigger.cloudProviderFlavor" -}}
{{- if .Values.global.cloudProvider.flavor }}
    {{- .Values.global.cloudProvider.flavor -}}
{{- else if .Values.cloudProvider -}}
    {{- .Values.cloudProvider.flavor | default "minikube" -}}
{{- else -}}
    {{ "minikube" }}
{{- end -}}
{{- end -}}

{{/*
Returns the cloud provider docker registry url from global if exists or from the chart's values
*/}}
{{- define "exporter-trigger.cloudProviderDockerRegistryUrl" -}}
{{- if .Values.global.cloudProvider.dockerRegistryUrl }}
    {{- printf "%s/" .Values.global.cloudProvider.dockerRegistryUrl -}}
{{- else if .Values.cloudProvider.dockerRegistryUrl -}}
    {{- printf "%s/" .Values.cloudProvider.dockerRegistryUrl -}}
{{- else -}}
{{- end -}}
{{- end -}}

{{/*
Returns the tracing url from global if set, otherwise from the chart's values
*/}}
{{- define "exporter-trigger.tracingUrl" -}}
{{- if .Values.global.telemetry.tracing.url }}
    {{- .Values.global.telemetry.tracing.url -}}
{{- else if .Values.telemetry.tracing.url -}}
    {{- .Values.telemetry.tracing.url -}}
{{- end -}}
{{- end -}}

{{/*
Returns the opentelemetry logging url from global if set, otherwise from the chart's values
*/}}
{{- define "exporter-trigger.opentelemetryLoggingUrl" -}}
{{- if .Values.global.telemetry.logger.opentelemetryOptions.url }}
    {{- .Values.global.telemetry.logger.opentelemetryOptions.url -}}
{{- else if .Values.telemetry.logger.opentelemetryOptions.url -}}
    {{- .Values.telemetry.logger.opentelemetryOptions.url -}}
{{- end -}}
{{- end -}}

{{/*
Renders a map of resource attributes as key=value,key=value for OTEL_RESOURCE_ATTRIBUTES.
Usage: {{ include "exporter-trigger.otelResourceAttributes" .resourceAttributes }}
*/}}
{{- define "exporter-trigger.otelResourceAttributes" -}}
{{- $attributes := list }}
{{- range $key, $value := . }}
{{- $attributes = append $attributes (printf "%s=%s" $key (toString $value)) }}
{{- end }}
{{- join "," $attributes }}
{{- end -}}
