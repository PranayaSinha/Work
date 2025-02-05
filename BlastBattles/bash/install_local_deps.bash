#!/bin/bash

##############
# DEPENDENCIES
##############

# Update system package repository
sudo apt update

# Install Podman for Ubuntu 20.10 and newer
sudo apt -y install podman

# Verify the installation of Podman
podman --version

# Install pip3 if not already installed
sudo apt -y install python3-pip

# Install podman-compose using pip3
sudo apt -y install podman-compose

# Verify the installation of podman-compose
podman-compose --version

# Install CNI plugins
sudo apt -y install containernetworking-plugins

# Restart Podman service
systemctl --user restart podman

##############
# POSTGRESQL SETUP
##############

# Install PostgreSQL
sudo apt -y install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to the postgres user and create a new user and database
sudo -u postgres psql << EOF
-- Create a new database user
CREATE USER blastbattles_user WITH PASSWORD 'pass';

-- Create a new database
CREATE DATABASE blastbattles;

-- Grant all privileges on the database to the user
GRANT ALL PRIVILEGES ON DATABASE blastbattles TO blastbattles_user;

-- Connect to the blastbattles database
\c blastbattles
 
-- Grant usage and create privileges on the public schema to blastbattles_user
GRANT USAGE, CREATE ON SCHEMA public TO blastbattles_user;
 
-- Grant select, insert, update, delete privileges on all tables in the schema
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO blastbattles_user;
EOF

# Verify the PostgreSQL setup
sudo -u postgres psql -c "\l"
sudo -u postgres psql -c "\du"

echo "PostgreSQL setup complete. User and database created."

# Install Redis
sudo apt install -y redis-server

# Start Redis service
sudo systemctl start redis

# Enable Redis to start on boot
sudo systemctl enable redis

# Verify Redis is running
sudo systemctl status redis

##############
# FLYWAY SETUP
##############

# Download Flyway if it's not already present
if [ ! -d "./tools/flyway" ]; then
    mkdir -p ./tools/flyway
    wget -qO- https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/10.17.3/flyway-commandline-10.17.3-linux-x64.tar.gz | tar xvz -C ./tools/flyway --strip-components=1
fi

# Run Flyway migration using the config file in flyway-config
./tools/flyway/flyway -configFiles=tools/flyway-config/conf/flyway.toml -locations=filesystem:tools/flyway-config/migrations migrate

echo "Flyway migration complete."
