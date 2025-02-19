import '../utilities/setup.js'; // Ensure dotenv is loaded
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { knexInstance } from '../../db/knex.js'; // Import the real knex instance
import { initializeRedis, getRedisClient } from '../../db/redisClient.js'; // Import the real Redis client
import { clearDatabase } from '../utilities/dbUtils.js';
import { updatePlayerEquippedCosmetics } from '../../api-server/src/domains/player_equipment/services/playerServices.js'; // Import the service to test
import path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

chai.use(chaiAsPromised);

describe('Player Equipment Tests', function () {
  this.timeout(60000);

  let redisClient;

  before(async function () {
    this.timeout(30000);

    // Ensure Redis client is initialized
    await initializeRedis();
    redisClient = getRedisClient();

    // Optionally clear the database for a clean state
    await clearDatabase(knexInstance);

    // seed for testing
    console.log('Seeding the database...');
    await knexInstance.seed.run({ directory: path.resolve(__dirname, '../../db/seeds') });
    console.log('Database seeded successfully');
  });

  after(async function () {
    this.timeout(30000);
  });
  const mockPlayerId = 1;
  it('should throw an error if some cosmetics do not exist', async () => {
    const mockPlayerEquippedCosmetics = [
      { itemId: 6, part: 'head' },
      { itemId: 100, part: 'accessory1' } // This accessory item doesn't exist
    ];

    await chai.expect(updatePlayerEquippedCosmetics(mockPlayerId, mockPlayerEquippedCosmetics))
      .to.be.rejectedWith('Validation failed for items: 100');
  });

  it('should throw an error if some cosmetics are not owned by the player', async () => {
    const mockPlayerEquippedCosmetics = [
      { itemId: 6, part: 'head' },
      { itemId: 28, part: 'accessory2' } // this item is not owned by the player
    ];

    await chai.expect(updatePlayerEquippedCosmetics(mockPlayerId, mockPlayerEquippedCosmetics))
      .to.be.rejectedWith('Validation failed for items: 28');
  });

  it('should update player equipment and unequip all items', async () => {
    const mockPlayerEquippedCosmetics = [
      { "part": "head", "itemId": null },
      { "part": "chest", "itemId": null },
      { "part": "legs", "itemId": null },
      { "part": "feet", "itemId": null },
      { "part": "hands", "itemId": null },
      { "part": "accessory1", "itemId": null },
      { "part": "accessory2", "itemId": null }
    ];

    const [updatedRow] = await updatePlayerEquippedCosmetics(mockPlayerId, mockPlayerEquippedCosmetics);

    chai.expect(updatedRow).to.have.property('player_id', 1);
    chai.expect(updatedRow).to.have.property('head_cosmetic_id', null);
    chai.expect(updatedRow).to.have.property('torso_cosmetic_id', null);
    chai.expect(updatedRow).to.have.property('legs_cosmetic_id', null);
    chai.expect(updatedRow).to.have.property('feet_cosmetic_id', null);
    chai.expect(updatedRow).to.have.property('hands_cosmetic_id', null);
    chai.expect(updatedRow).to.have.property('accessory1_cosmetic_id', null);
    chai.expect(updatedRow).to.have.property('accessory2_cosmetic_id', null);
  });

  it('should update player equipment with mock data', async function () {
    // Mock data for testing
    const mockPlayerEquippedCosmetics = [
      { "part": "head", "itemId": 1 },
      { "part": "chest", "itemId": 8 },
      { "part": "legs", "itemId": 14 },
      { "part": "feet", "itemId": 10 },
      { "part": "hands", "itemId": 16 },
      { "part": "accessory1", "itemId": 27 },
      { "part": "accessory2", "itemId": 29 }
    ];

    // Call the function to update player equipment
    const [updatedRow] = await updatePlayerEquippedCosmetics(mockPlayerId, mockPlayerEquippedCosmetics);

    // Assertions to validate the updated data
    chai.expect(updatedRow).to.have.property('player_id', mockPlayerId);
    chai.expect(updatedRow).to.have.property('head_cosmetic_id', mockPlayerEquippedCosmetics[0].itemId);
    chai.expect(updatedRow).to.have.property('torso_cosmetic_id', mockPlayerEquippedCosmetics[1].itemId);
    chai.expect(updatedRow).to.have.property('legs_cosmetic_id', mockPlayerEquippedCosmetics[2].itemId);
    chai.expect(updatedRow).to.have.property('feet_cosmetic_id', mockPlayerEquippedCosmetics[3].itemId);
    chai.expect(updatedRow).to.have.property('hands_cosmetic_id', mockPlayerEquippedCosmetics[4].itemId);
    chai.expect(updatedRow).to.have.property('accessory1_cosmetic_id', mockPlayerEquippedCosmetics[5].itemId);
    chai.expect(updatedRow).to.have.property('accessory2_cosmetic_id', mockPlayerEquippedCosmetics[6].itemId);
  });

  it('should throw an error if some cosmetics are not equipped in the right slots', async () => {
    const mockPlayerEquippedCosmetics = [
      { itemId: 6, part: 'head' },
      { itemId: 28, part: 'legs' } // this item an accessory slot
    ];

    await chai.expect(updatePlayerEquippedCosmetics(mockPlayerId, mockPlayerEquippedCosmetics))
      .to.be.rejectedWith('Validation failed for items: 28');
  });
});