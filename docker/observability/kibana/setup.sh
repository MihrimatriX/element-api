#!/bin/sh
echo "[kibana-setup] Kibana bekleniyor..."
i=0
while [ "$i" -lt 90 ]; do
  if curl -sf "http://kibana:5601/api/status" >/dev/null 2>&1; then
    break
  fi
  i=$((i + 1))
  sleep 2
done

if ! curl -sf "http://kibana:5601/api/status" >/dev/null 2>&1; then
  echo "[kibana-setup] Kibana hazir degil, cikiliyor."
  exit 1
fi

create_view() {
  title="$1"
  time_field="${2:-@timestamp}"
  body="{\"data_view\":{\"title\":\"${title}\",\"name\":\"${title}\",\"timeFieldName\":\"${time_field}\"}}"
  if curl -sf -X POST "http://kibana:5601/api/data_views/data_view" \
    -H "kbn-xsrf: true" \
    -H "Content-Type: application/json" \
    -d "$body" >/dev/null 2>&1; then
    echo "[kibana-setup] Olusturuldu: ${title}"
  else
    echo "[kibana-setup] Zaten var veya atlandi: ${title}"
  fi
}

create_view "element-app-logs-*"
create_view "element-logs-*"
create_view "element-metrics-*"

echo "[kibana-setup] Tamamlandi."
