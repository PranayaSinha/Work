#!/bin/bash

##############
# SERVICES
##############

# Navigate to api-server directory
cd api-server

# Install dependencies
npm install

# Go back to the root directory
cd ..

# Stop and remove all running podman containers
podman-compose down

# Remove any leftover containers, images, and networks if any
podman rm -f $(podman ps -a -q)
podman rmi -f $(podman images -q)
podman network rm $(podman network ls -q)

# Start Docker containers, building first
podman-compose up --build
