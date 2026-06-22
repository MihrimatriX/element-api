FROM grafana/promtail:3.4.2
COPY promtail-config.yml /etc/promtail/config.yml
USER root
CMD ["-config.file=/etc/promtail/config.yml", "-config.expand-env=true"]
