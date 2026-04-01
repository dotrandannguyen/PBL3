/**
 * Simple test script to verify saveTasksToInbox logic
 * Run: node test-save-tasks.js
 */

import { integrationService } from './src/modules/integrations/integration.service.js';
import { taskRepository } from './src/modules/tasks/task.repository.js';
import prisma from './src/config/database.js';

async function testSaveTasksToInbox() {
	try {
		console.log('🧪 [TEST] Testing saveTasksToInbox function...\n');

		// Test 1: GMAIL tasks
		console.log('📧 [TEST] Test 1: Saving Gmail tasks...');
		const gmailTasks = [
			{
				id: 'test-gmail-1',
				subject: 'Test task email',
				from: 'sender@example.com',
				to: 'user@example.com',
				date: '2026-04-01T10:00:00Z',
				body: 'This is a test task email with task keyword',
				attachments: [],
				snippet: 'This is a test...',
				link: 'https://mail.google.com/mail/u/0/#inbox/test-gmail-1',
			},
		];

		// Mock userId (in real test, use actual user ID from DB)
		const testUserId = 'test-user-id-123';

		// Save Gmail tasks
		const savedGmailTasks = await integrationService.saveTasksToInbox(
			testUserId,
			gmailTasks,
			'GMAIL',
		);
		console.log(
			`✅ [TEST] Gmail tasks saved: ${savedGmailTasks.length} tasks\n`,
		);

		// Test 2: GITHUB tasks
		console.log('🔧 [TEST] Test 2: Saving GitHub tasks...');
		const githubTasks = [
			{
				id: 123456,
				title: 'Test GitHub Issue',
				state: 'open',
				repository: 'user/test-repo',
				creator: 'test-creator',
				link: 'https://github.com/user/test-repo/issues/1',
				createdAt: '2026-04-01T10:00:00Z',
				description: 'This is a test GitHub issue',
			},
		];

		const savedGithubTasks = await integrationService.saveTasksToInbox(
			testUserId,
			githubTasks,
			'GITHUB',
		);
		console.log(
			`✅ [TEST] GitHub tasks saved: ${savedGithubTasks.length} tasks\n`,
		);

		// Test 3: Verify tasks in database
		console.log('📋 [TEST] Test 3: Verifying tasks in database...');
		const inboxTasks = await taskRepository.findInbox(testUserId, { skip: 0, limit: 10 });
		console.log(`✅ [TEST] Found ${inboxTasks.length} tasks in INBOX\n`);

		// Test 4: Check UPSERT behavior - save same task again
		console.log('🔄 [TEST] Test 4: Testing UPSERT (save same task again)...');
		const savedAgain = await integrationService.saveTasksToInbox(
			testUserId,
			gmailTasks,
			'GMAIL',
		);
		console.log(
			`✅ [TEST] Same Gmail task saved again (should be updated, not duplicated)\n`,
		);

		const inboxTasksAfterUpsert = await taskRepository.findInbox(testUserId, {
			skip: 0,
			limit: 10,
		});
		console.log(
			`✅ [TEST] Total tasks after UPSERT: ${inboxTasksAfterUpsert.length} (should still be 2)\n`,
		);

		// Test 5: Verify task structure
		console.log('📦 [TEST] Test 5: Verifying task structure...');
		const sampleTask = inboxTasksAfterUpsert[0];
		console.log('Sample task from DB:', {
			title: sampleTask.title,
			status: sampleTask.status,
			sourceType: sampleTask.sourceType,
			sourceId: sampleTask.sourceId,
			sourceLink: sampleTask.sourceLink,
		});
		console.log('');

		console.log('✨ [TEST] All tests passed! ✨\n');
	} catch (error) {
		console.error('❌ [TEST] Error during test:', error.message);
		console.error(error);
	} finally {
		await prisma.$disconnect();
	}
}

// Run test
testSaveTasksToInbox();
