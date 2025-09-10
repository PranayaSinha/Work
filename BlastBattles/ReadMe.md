# Blast Battles Backend

This repository contains the backend infrastructure for the game Blast Battles. It includes various servers and services essential for matchmaking, signaling, and API handling.

## Directory Structure

- **api-server**: Handles REST API requests for trading, equipping, purchases, upgrades, and other game-related operations.
- **matchmaking-server**: WebSocket server responsible for quickly finding matches based on MMR. Future enhancements will include matching based on relative player latency.
- **signaling-server**: Coordinates connecting players for found matches via WebRTC.
- **exchange-server**: Will handle bid/ask matching for all items in round-robin fashion
- **match-processor-server**: [TODO] Processes matches via polling to verify resources/items received from a match to ensure economic stability and resource cheating prevention.
- **bookkeeping-server**: [TODO] Will handle leaderboards, cron job type processing, etc
- **godot-verification-server**: [TODO] [Ignored for now]
- **shared**: Contains shared resources and utilities used by multiple services.
- **infrastructure**: Contains Terraform/Kubernetes IaC files
- **setup.sh**: Script for setting up the development environment.
- **docker-compose.yml**: Docker Compose file for orchestrating multi-container Docker applications.

## TEMPORARY NOTE!!!
While we're still getting the scaffolding up for docker, run services from their folder. i.e., cd into api-server, npm i, npm run dev. 

## Setup

To set up a fresh development environment, run:


```sh
bash install_podman.sh
bash setup.sh

```

`bash install-local-deps.bash # Installs project dependencies`

Then, to get all servers up and running in podman, run:

`bash fresh_compose.bash # Clear old images/containers, compose up fresh containers`


NOTE: If you're having CNI issues, then Ubuntu mis-installed your CNI.
See if you can parse the errors, ctrl+click on the mis-configed files, and GPT your way to success.
Otherwise, reach out to an instructor.

### Flyway migration tips

Flyway is how our data migrations are handled. 
For local development, we've setup a base script in tools/flyway-config/conf/flyway.toml

Here are some useful commands when developing locally:

Clear out existing flyway and re-start from new (WILL delete ALL of your tables and data!):
`./tools/flyway/flyway -configFiles=tools/flyway-config/conf/flyway.toml clean`
`./tools/flyway/flyway -configFiles=tools/flyway-config/conf/flyway.toml migrate`

Repair (useful for resolving checksum issues or other migration-related errors):
`./tools/flyway/flyway -configFiles=tools/flyway-config/conf/flyway.toml repair`
