{{- define "element-market.name" -}}
element-market
{{- end }}

{{- define "element-market.fullname" -}}
{{ include "element-market.name" . }}
{{- end }}

{{- define "element-market.postgresConnection" -}}
{{- $root := .root -}}
Host={{ $root.Values.global.postgres.host }};Port={{ $root.Values.global.postgres.port }};Database={{ .database }};Username={{ $root.Values.global.postgres.user }};Password={{ $root.Values.global.postgres.password }}
{{- end }}
