import '../utilities/setup.js'; // Ensure dotenv is loaded
import { expect } from 'chai';
import { knexInstance } from '../../db/knex.js'; // Import the real knex instance
import { initializeRedis, getRedisClient } from '../../db/redisClient.js'; // Import the real Redis client
import { clearDatabase } from '../utilities/dbUtils.js';
import {
    createItem,
    updateItemVerification,
    flagItem,
    unflagItem,
    findItemById,
    findItemsByOwner,
} from '../../api-server/src/domains/item/service/itemModel.js'; // Import the service to test

describe('Item Model Functional Tests', function () {
    this.timeout(60000);

    let redisClient;

    before(async function () {
        this.timeout(30000);

        // Ensure Redis client is initialized
        await initializeRedis();
        redisClient = getRedisClient();

        // Optionally clear the database for a clean state
        await clearDatabase(knexInstance);
    });

    after(async function () {
        this.timeout(30000);
    });

    it('should insert and retrieve an item in the item_instances table', async function () {
        // Mock item data
        const mockItem = {
            type: 'weapon',
            owner_id: 1,
            in_market: false,
            origin_lootbox_id: 123,
            flagged: false,
            pending: true,
        };

        // Insert the item
        const itemId = await createItem(mockItem);

        // Retrieve the inserted item
        const dbItem = await findItemById(itemId);

        // Assertions
        expect(dbItem.type).to.equal(mockItem.type);
        expect(dbItem.owner_id).to.equal(mockItem.owner_id);
        expect(dbItem.in_market).to.equal(mockItem.in_market);
        expect(dbItem.origin_lootbox_id).to.equal(mockItem.origin_lootbox_id);
        expect(dbItem.flagged).to.equal(mockItem.flagged);
        expect(dbItem.pending).to.equal(mockItem.pending);
    });

    it('should update an item verification status in the item_instances table', async function () {
        // Mock item data
        const mockItem = {
            type: 'weapon',
            owner_id: 1,
            in_market: false,
            origin_lootbox_id: 123,
            flagged: false,
            pending: true,
        };

        // Insert the item
        const itemId = await createItem(mockItem);

        // Update the item to verified
        const updatedItem = await updateItemVerification(itemId, true);

        // Assertions
        expect(updatedItem.pending).to.be.false;
        expect(updatedItem.verified_at).to.not.be.null;
    });

    it('should flag an item in the item_instances table', async function () {
        // Mock item data
        const mockItem = {
            type: 'weapon',
            owner_id: 1,
            in_market: false,
            origin_lootbox_id: 123,
            flagged: false,
        };

        // Insert the item
        const itemId = await createItem(mockItem);

        // Flag the item
        const flaggedItem = await flagItem(itemId, false);

        // Assertions
        expect(flaggedItem.flagged).to.be.true;
        expect(flaggedItem.flagged_at).to.not.be.null;
        expect(flaggedItem.can_trade).to.be.false;
    });

    it('should unflag an item in the item_instances table', async function () {
        // Mock item data
        const mockItem = {
            type: 'weapon',
            owner_id: 1,
            in_market: false,
            origin_lootbox_id: 123,
            flagged: true,
            flagged_at: new Date(),
        };

        // Insert the item
        const itemId = await createItem(mockItem);

        // Unflag the item
        const unflaggedItem = await unflagItem(itemId);

        // Assertions
        expect(unflaggedItem.flagged).to.be.false;
        expect(unflaggedItem.unflagged_at).to.not.be.null;
    });

    it('should retrieve all items owned by a player', async function () {
        // Mock item data
        const mockItems = [
            { type: 'weapon', owner_id: 1, in_market: false, origin_lootbox_id: 123 },
            { type: 'rune', owner_id: 1, in_market: true, origin_lootbox_id: 124 },
        ];

        // Insert items
        for (const item of mockItems) {
            await createItem(item);
        }

        // Retrieve items for the owner
        const items = await findItemsByOwner(1);

        // Assertions
        expect(items).to.have.lengthOf(mockItems.length);
        items.forEach((dbItem, index) => {
            expect(dbItem.type).to.equal(mockItems[index].type);
            expect(dbItem.owner_id).to.equal(mockItems[index].owner_id);
            expect(dbItem.origin_lootbox_id).to.equal(mockItems[index].origin_lootbox_id);
        });
    });
});