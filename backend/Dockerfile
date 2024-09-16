# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Install pipenv, a tool for managing Python project dependencies
RUN pip install pipenv

# Set the working directory in the container
WORKDIR /usr/src/llm_service/

COPY . .

# Install dependencies
RUN pipenv install --dev --verbose --extra-pip-args="--prefer-binary"
RUN #pipenv sync --dev --system --verbose --extra-pip-args="--prefer-binary"

# Expose the port the app runs on
EXPOSE 8000
