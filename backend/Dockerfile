# Use an official Python runtime based on Alpine as a parent image
FROM python:3.12-alpine

# Install pipenv, a tool for managing Python project dependencies
RUN pip install pipenv

# Set the working directory in the container
WORKDIR /usr/src/llm_service/

COPY Pipfile* .

# Install dependencies
#RUN pipenv install --dev --verbose --extra-pip-args="--prefer-binary"
RUN pipenv sync --dev --system --verbose --extra-pip-args="--prefer-binary"

COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Run the FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
