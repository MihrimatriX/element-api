FROM docker.elastic.co/beats/metricbeat:8.17.0
COPY metricbeat.yml /usr/share/metricbeat/metricbeat.yml
USER root
CMD ["metricbeat", "-e", "-E", "strict.perms=false"]
