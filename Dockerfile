FROM python:3.12-slim

WORKDIR /app

COPY server.py index.html showtime.html app.js showtime.js style.css ./

COPY trailers/ ./trailers/
COPY showtime-trailers/ ./showtime-trailers/

EXPOSE 8080

CMD ["python3", "server.py"]
