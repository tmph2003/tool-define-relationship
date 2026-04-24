{{/*
=============================================================================
Relationship Designer — Template Helpers
=============================================================================
*/}}

{{/*
Chart name (truncated to 63 chars).
*/}}
{{- define "rd.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Fully qualified app name (release + chart, truncated to 63 chars).
*/}}
{{- define "rd.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels applied to all resources.
*/}}
{{- define "rd.labels" -}}
helm.sh/chart: {{ include "rd.name" . }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: {{ include "rd.name" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{/*
Selector labels — used by Deployments & Services.
Usage: include "rd.selectorLabels" (dict "root" . "component" "backend")
*/}}
{{- define "rd.selectorLabels" -}}
app.kubernetes.io/name: {{ include "rd.name" .root }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
Namespace — prefer global.namespace, fallback to Release.Namespace.
*/}}
{{- define "rd.namespace" -}}
{{- default .Release.Namespace ((.Values.global).namespace) }}
{{- end }}

{{/*
Full image reference: registry/repository:tag
Produces: harbor.sunhouse.com.vn/shg-dev-dp/rd-backend:latest
Usage: include "rd.image" (dict "registry" .registry "repository" .repository "tag" .tag)
*/}}
{{- define "rd.image" -}}
{{- if .registry }}
{{- printf "%s/%s:%s" .registry .repository .tag }}
{{- else }}
{{- printf "%s:%s" .repository .tag }}
{{- end }}
{{- end }}

{{/*
imagePullSecrets — renders from top-level .Values.imagePullSecrets
*/}}
{{- define "rd.imagePullSecrets" -}}
{{- with .Values.imagePullSecrets }}
imagePullSecrets:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- end }}

{{/*
DATABASE_URL constructed from postgresql values.
*/}}
{{- define "rd.databaseUrl" -}}
postgresql+asyncpg://{{ .Values.postgresql.auth.username }}:{{ .Values.postgresql.auth.password }}@{{ include "rd.fullname" . }}-db:{{ .Values.postgresql.service.port }}/{{ .Values.postgresql.auth.database }}
{{- end }}
