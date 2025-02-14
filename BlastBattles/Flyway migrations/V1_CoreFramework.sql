-- Create Rarity Enum
CREATE TYPE rarity_enum AS ENUM ('common', 'uncommon', 'rare', 'legendary', 'unique');

-- Create Item Type Enum
CREATE TYPE item_type_enum AS ENUM ('weapon', 'weapon_mod', 'weapon_skin', 'ammo', 'rune', 'body_cosmetic', 'lootbox');

-- Create Body Part Enum
CREATE TYPE body_part_enum AS ENUM ('head', 'chest', 'legs', 'feet', 'hands', 'accessory');

-- Create Players Table
CREATE TABLE players (
    player_id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(255),
    rank INT,
    gold BIGINT DEFAULT 0,                         -- Total verified gold
    pending_gold BIGINT DEFAULT 0,                 -- Pending gold awaiting verification
    floatium BIGINT DEFAULT 0,                     -- Total verified Floatium
    pending_floatium BIGINT DEFAULT 0              -- Pending Floatium awaiting verification
    fairies INT DEFAULT 0,
    pending_fairies INT DEFAULT 0
);

-- Create Player Logins Table
CREATE TABLE player_logins (
    login_id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    jwt_token TEXT NOT NULL,
    jwt_expiration TIMESTAMP NOT NULL,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);

-- Create Base Item Definitions Table
CREATE TABLE base_definitions (
    definition_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rarity rarity_enum NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Initial creation time
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Update time for optimistic locking
    additional_attributes JSONB
);

-- Inherit from Base Item Definitions
CREATE TABLE weapon_definitions (
    definition_id SERIAL PRIMARY KEY,
    weight DECIMAL(5,2),
    FOREIGN KEY (definition_id) REFERENCES base_definitions(definition_id) ON DELETE CASCADE
);

CREATE TABLE weapon_mod_definitions (
    definition_id SERIAL PRIMARY KEY,
    mod_type VARCHAR(50),
    effect_description TEXT,
    FOREIGN KEY (definition_id) REFERENCES base_definitions(definition_id) ON DELETE CASCADE
);

CREATE TABLE weapon_skin_definitions (
    definition_id SERIAL PRIMARY KEY,
    skin_type VARCHAR(50),
    FOREIGN KEY (definition_id) REFERENCES base_definitions(definition_id) ON DELETE CASCADE
);

CREATE TABLE ammo_definitions (
    definition_id SERIAL PRIMARY KEY,
    ammo_type VARCHAR(50),
    weight DECIMAL(5,2),
    FOREIGN KEY (definition_id) REFERENCES base_definitions(definition_id) ON DELETE CASCADE
);

CREATE TABLE rune_definitions (
    definition_id SERIAL PRIMARY KEY,
    FOREIGN KEY (definition_id) REFERENCES base_definitions(definition_id) ON DELETE CASCADE
);

CREATE TABLE body_cosmetic_definitions (
    definition_id SERIAL PRIMARY KEY,
    part body_part_enum NOT NULL,
    FOREIGN KEY (definition_id) REFERENCES base_definitions(definition_id) ON DELETE CASCADE
);

-- Create Lootbox Definitions Table
CREATE TABLE lootbox_definitions (
    definition_id SERIAL PRIMARY KEY,
    tier rarity_enum NOT NULL,
    FOREIGN KEY (definition_id) REFERENCES base_definitions(definition_id) ON DELETE CASCADE
);

-- Create Lootbox Item Drops Table
CREATE TABLE lootbox_item_drops (
    drop_id SERIAL PRIMARY KEY,
    lootbox_definition_id INT NOT NULL,
    item_definition_id INT NOT NULL,
    rarity rarity_enum NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Initial creation time
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Update time for optimistic locking
    FOREIGN KEY (lootbox_definition_id) REFERENCES lootbox_definitions(definition_id) ON DELETE CASCADE,
    FOREIGN KEY (item_definition_id) REFERENCES base_definitions(definition_id) ON DELETE CASCADE
);

-- Create Lootbox Instances Table first without the item_id foreign key
CREATE TABLE lootbox_instances (
	instance_id SERIAL PRIMARY KEY,
	definition_id INT REFERENCES lootbox_definitions(definition_id) ON DELETE CASCADE,
	opened_by INT REFERENCES players(player_id) ON DELETE SET NULL,
	opened_at TIMESTAMP DEFAULT NULL
);

-- Items Table with Flagging and Pending Columns
CREATE TABLE item_instances (
	id SERIAL PRIMARY KEY,
	type item_type_enum NOT NULL,
	owner_id INT NOT NULL,
	quantity INT NOT NULL DEFAULT 1,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	origin_lootbox_id INT REFERENCES lootbox_instances(instance_id) ON DELETE SET NULL,
    flagged BOOLEAN DEFAULT FALSE,                     -- Indicates whether the item is flagged
    flagged_at TIMESTAMP DEFAULT NULL,                 -- Timestamp when the item was flagged
    unflagged_at TIMESTAMP DEFAULT NULL,               -- Timestamp when the item was unflagged
    can_trade BOOLEAN DEFAULT FALSE,                  -- Whether the flagged item can be traded
    pending BOOLEAN DEFAULT TRUE,                     -- Whether the item is pending verification
    verified_at TIMESTAMP DEFAULT NULL                -- Timestamp when the item was verified
);

-- Create Weapon Mod Instances Table - Ensure it's created before referencing it
CREATE TABLE weapon_mod_instances (
    instance_id SERIAL PRIMARY KEY,
    item_id INT REFERENCES item_instances(id) ON DELETE CASCADE,
    definition_id INT REFERENCES weapon_mod_definitions(definition_id) ON DELETE CASCADE,
    level INT,
    UNIQUE(item_id)
);

-- Create Weapon Skin Instances Table
CREATE TABLE weapon_skin_instances (
    instance_id SERIAL PRIMARY KEY,
    item_id INT REFERENCES item_instances(id) ON DELETE CASCADE,
    definition_id INT REFERENCES weapon_skin_definitions(definition_id) ON DELETE CASCADE,
    shimmer BOOLEAN DEFAULT FALSE,
    UNIQUE(item_id)
);

-- Create Weapon Instances Table (after weapon_mod_instances and weapon_skin_instances)
CREATE TABLE weapon_instances (
    instance_id SERIAL PRIMARY KEY,
    item_id INT REFERENCES item_instances(id) ON DELETE CASCADE,
    definition_id INT REFERENCES weapon_definitions(definition_id) ON DELETE CASCADE,
    mod_slot1_id INT,
    mod_slot2_id INT,
    equipped_skin_id INT,
    FOREIGN KEY (mod_slot1_id) REFERENCES weapon_mod_instances(instance_id) ON DELETE SET NULL,
    FOREIGN KEY (mod_slot2_id) REFERENCES weapon_mod_instances(instance_id) ON DELETE SET NULL,
    FOREIGN KEY (equipped_skin_id) REFERENCES weapon_skin_instances(instance_id) ON DELETE SET NULL,
    UNIQUE(item_id)
);

-- Create Ammo Instances Table
CREATE TABLE ammo_instances (
    instance_id SERIAL PRIMARY KEY,
    item_id INT REFERENCES item_instances(id) ON DELETE CASCADE,
    definition_id INT REFERENCES ammo_definitions(definition_id) ON DELETE CASCADE,
    UNIQUE(item_id)
);

-- Create Rune Instances Table
CREATE TABLE rune_instances (
    instance_id SERIAL PRIMARY KEY,
    item_id INT REFERENCES item_instances(id) ON DELETE CASCADE,
    definition_id INT REFERENCES rune_definitions(definition_id) ON DELETE CASCADE,
    spell VARCHAR(50),
    starting_enchant_timestamp TIMESTAMP,
    invested_seconds INT,
    UNIQUE(item_id)
);

-- Create Body Cosmetic Instances Table
CREATE TABLE body_cosmetic_instances (
    instance_id SERIAL PRIMARY KEY,
    item_id INT REFERENCES item_instances(id) ON DELETE CASCADE,
    definition_id INT REFERENCES body_cosmetic_definitions(definition_id) ON DELETE CASCADE,
    shimmer BOOLEAN DEFAULT FALSE,
    special_effects INT,
    UNIQUE(item_id)
);

-- Create Equipped Cosmetics Table with Foreign Key Constraints
CREATE TABLE equipped_cosmetics (
    player_id INT NOT NULL,
    head_cosmetic_id INT,
    torso_cosmetic_id INT,
    legs_cosmetic_id INT,
    feet_cosmetic_id INT,
    hands_cosmetic_id INT,
    accessory1_cosmetic_id INT,
    accessory2_cosmetic_id INT,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- Update time for optimistic locking
    PRIMARY KEY (player_id),
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (head_cosmetic_id) REFERENCES body_cosmetic_instances(instance_id) ON DELETE SET NULL,
    FOREIGN KEY (torso_cosmetic_id) REFERENCES body_cosmetic_instances(instance_id) ON DELETE SET NULL,
    FOREIGN KEY (legs_cosmetic_id) REFERENCES body_cosmetic_instances(instance_id) ON DELETE SET NULL,
    FOREIGN KEY (feet_cosmetic_id) REFERENCES body_cosmetic_instances(instance_id) ON DELETE SET NULL,
    FOREIGN KEY (hands_cosmetic_id) REFERENCES body_cosmetic_instances(instance_id) ON DELETE SET NULL,
    FOREIGN KEY (accessory1_cosmetic_id) REFERENCES body_cosmetic_instances(instance_id) ON DELETE SET NULL,
    FOREIGN KEY (accessory2_cosmetic_id) REFERENCES body_cosmetic_instances(instance_id) ON DELETE SET NULL
);

-- Indexes for efficient querying
CREATE INDEX idx_type ON item_instances(type);
CREATE INDEX idx_owner_id ON item_instances(owner_id);

-- Create Matches Table
CREATE TABLE matches (
    match_id SERIAL PRIMARY KEY,
    match_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    match_end_time TIMESTAMP,
    map_seed VARCHAR(50) 
);

-- Create Match Reports Table
CREATE TABLE match_reports (
    report_id SERIAL PRIMARY KEY,
    match_id INT NOT NULL,
    player_id INT NOT NULL,
    claimed_placement INT,
    claimed_resources JSONB,   -- stores resources claimed by the player
    report_data JSONB,         -- additional match-specific data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verification_status VARCHAR(20) DEFAULT 'pending',  -- e.g., 'passed', 'failed', 'flagged'
    FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);

-- Create Flags Table
CREATE TABLE flags (
    flag_id SERIAL PRIMARY KEY,
    flag_type VARCHAR(50) NOT NULL, 
    related_match_id INT,
    related_player_id INT,
    related_item_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolution_time TIMESTAMP,
    FOREIGN KEY (related_match_id) REFERENCES matches(match_id) ON DELETE CASCADE,
    FOREIGN KEY (related_player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (related_item_id) REFERENCES item_instances(id) ON DELETE CASCADE
);

-- Create Flagged Accounts Table
CREATE TABLE flagged_accounts (
    flagged_account_id SERIAL PRIMARY KEY,
    player_id INT NOT NULL,
    flag_count INT DEFAULT 0,
    last_flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);

-- Verified Match Outcomes Table for Discrepancies Only
CREATE TABLE verified_match_outcomes (
    outcome_id SERIAL PRIMARY KEY,
    match_id INT NOT NULL,
    player_id INT NOT NULL,
    final_placement INT,
    verified_resources JSONB,  -- stores corrected resources after verification
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
);

-- Indexes for Efficient Querying on New Tables
CREATE INDEX idx_flag_type ON flags(flag_type);
CREATE INDEX idx_match_id ON match_reports(match_id);
CREATE INDEX idx_player_id ON flagged_accounts(player_id);
CREATE INDEX idx_flagged_items ON item_instances(flagged);

-- Add Item-Origin Tracking
CREATE TABLE lootbox_item_sources (
    source_id SERIAL PRIMARY KEY,
    item_id INT NOT NULL,                                 
    lootbox_instance_id INT NOT NULL,                     
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       
    pending BOOLEAN DEFAULT TRUE,                        -- Indicates if the lootbox-generated item is pending
    verified_at TIMESTAMP DEFAULT NULL,                  -- Timestamp for verification of lootbox item origin
    FOREIGN KEY (item_id) REFERENCES item_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (lootbox_instance_id) REFERENCES lootbox_instances(instance_id) ON DELETE CASCADE
);


-- Alter Table
-- Add the item_id foreign key to lootbox_instances
ALTER TABLE lootbox_instances
ADD COLUMN item_id INT REFERENCES item_instances(id) ON DELETE CASCADE;