# Use an official node image as a parent image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy the current directory contents into the container
COPY . .

# Install dependencies
RUN npm install

# Expose the port the app runs on
EXPOSE 3000

# Start the React development server
CMD ["npm", "start"]
