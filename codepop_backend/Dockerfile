# syntax=docker/dockerfile:1.7

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r /app/requirements.txt

COPY codepop_backend /app/codepop_backend

WORKDIR /app/codepop_backend

EXPOSE 8000

CMD ["gunicorn", "codepop_backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120"]
