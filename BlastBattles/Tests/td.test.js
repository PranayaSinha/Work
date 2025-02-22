import { expect } from 'chai';
import * as td from 'testdouble'; // Import Testdouble

describe('Mock getPlayerByUsername', function () {
	let getPlayerByUsername;

	before(async function () {
		// Mock result for `findUserByUsername`
		const mockResult = {
			player_id: 1,
			username: 'mock_player',
			email: 'mock@example.com',
			email_verified: true,
			password_hash: 'mock_hash',
			status: 'active',
			rank: 10,
			gold: 5000,
			floatium: 2000,
		};

		// Dynamically import the original module
		const originalPlayerModel = await import('../../api-server/src/domains/auth/model/playerModel.js');

		// Create a mock for `findUserByUsername`
		const mockFindUserByUsername = td.func('findUserByUsername');
		td.when(mockFindUserByUsername('mock_player')).thenResolve(mockResult);

		// Replace only `findUserByUsername` while keeping other exports untouched
		td.replaceEsm('../../api-server/src/domains/auth/model/playerModel.js', {
			...originalPlayerModel, // Spread all original exports
			findUserByUsername: mockFindUserByUsername, // Replace just this one
		});

		// Dynamically import the service after replacing the dependency
		const service = await import('../../api-server/src/domains/auth/service/authService.js');
		getPlayerByUsername = service.getPlayerByUsername; // Assign the imported function
	});

	after(function () {
		// Reset Testdouble mocks
		td.reset();
	});

	it('should mock findUserByUsername and return mock player data', async function () {
		// Mocked username
		const username = 'mock_player';

		// Call the service
		const player = await getPlayerByUsername(username);

		// Assertions
		expect(player).to.exist; // Ensure player is not undefined
		expect(player.username).to.equal('mock_player');
		expect(player.email).to.equal('mock@example.com');
		expect(player.rank).to.equal(10);
	});
});
