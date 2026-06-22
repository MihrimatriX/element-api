FROM docker.elastic.co/beats/filebeat:8.17.0
COPY filebeat.yml /usr/share/filebeat/filebeat.yml
USER root
CMD ["filebeat", "-e", "-E", "strict.perms=false"]
