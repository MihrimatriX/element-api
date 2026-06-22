FROM curlimages/curl:8.12.1
USER root
COPY setup.sh /setup/setup.sh
RUN tr -d '\r' < /setup/setup.sh > /tmp/setup.sh && mv /tmp/setup.sh /setup/setup.sh && chmod +x /setup/setup.sh
USER curl_user
ENTRYPOINT ["/bin/sh", "/setup/setup.sh"]
