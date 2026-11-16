# Replaces the upstream action Dockerfile, which builds on a mutable base image
# and pipes remote installers into bash. This repository only generates the
# mcp-typescript target, so the image carries git, Node and pipx (the action
# installs pinned poetry and uv with pipx before generation).
FROM golang:1.24-alpine3.23@sha256:8bee1901f1e530bfb4a7850aa7a479d17ae3a18beb6e09064ed54cfd245b7191 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
COPY internal/ ./internal/
COPY pkg/ ./pkg/
RUN go build -o /action

FROM alpine:3.23@sha256:469c9ea410b9215eaee7976ba6c0639039b444be8e5d638f7abbada189971eb2
RUN apk add --no-cache bash git nodejs npm python3 py3-pip pipx
COPY --from=builder /action /action
# The action downloads a CLI only when /bin/speakeasy is missing.
COPY speakeasy /bin/speakeasy
ENTRYPOINT ["/action"]
