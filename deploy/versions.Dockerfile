FROM node:26-bookworm-slim
WORKDIR /workspace
COPY services services
RUN mkdir -p .local && chown -R 10001:10001 .local
USER 10001
CMD ["node","services/version-service.mjs"]
