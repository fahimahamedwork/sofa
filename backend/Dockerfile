FROM golang:1.23-alpine AS builder

# Allow Go to auto-download the required toolchain (e.g. go1.25 for newer deps)
ENV GOTOOLCHAIN=auto

WORKDIR /app

RUN apk add --no-cache git gcc musl-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=1 GOOS=linux go build -o /sofa-server ./cmd/server/

FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata git

WORKDIR /app

COPY --from=builder /sofa-server /app/sofa-server
COPY --from=builder /usr/lib/libgcc* /usr/lib/
COPY --from=builder /usr/lib/libstdc++* /usr/lib/
COPY --from=builder /usr/lib/libmusl* /usr/lib/
COPY config.yaml /app/config.yaml
COPY migrations/ /app/migrations/

EXPOSE 8080

CMD ["/app/sofa-server"]
