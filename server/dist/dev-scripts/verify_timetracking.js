"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const JiraService_1 = require("../services/JiraService");
// Load environment variables from the server/ root
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
async function verifyTimetracking() {
    console.log('🚀 Starting Timetracking Field Verification...');
    try {
        // Initialize the service
        JiraService_1.jiraService.initClient();
        console.log('✅ Jira Service Initialized');
        // Test 1: Search for a Bug Issue
        // We look for *any* Bug to see if the structure comes back correctly
        console.log('\n🔍 Test 1: Searching for a Bug to inspect fields...');
        const bugIssues = await JiraService_1.jiraService.searchIssues('issuetype = Bug ORDER BY created DESC', 1);
        if (bugIssues.length === 0) {
            console.warn('⚠️ No Bugs found in Jira to test against. Skipping Test 1 details.');
        }
        else {
            const bug = bugIssues[0];
            console.log(`✅ Found Bug: ${bug.key}`);
            // Check if timetracking field is present in the raw response (mapped in JiraService)
            // Note: JiraService.searchIssues returns Promise<JiraIssue[]>. 
            // The interface has 'fields' but we want to see if 'timetracking' is in there.
            // TypeScript might complain if it's not in the interface, so we cast to any for inspection.
            const rawFields = bug.fields;
            if (rawFields.timetracking !== undefined) {
                console.log('✅ [PASS] "timetracking" field IS present in search results.');
                console.log('   Value:', JSON.stringify(rawFields.timetracking, null, 2));
            }
            else {
                console.error('❌ [FAIL] "timetracking" field is MISSING in search results.');
            }
        }
        // Test 2: Fetch Specific Issue Details
        if (bugIssues.length > 0) {
            const bugKey = bugIssues[0].key;
            console.log(`\n🔍 Test 2: Fetching details for ${bugKey}...`);
            const issueDetails = await JiraService_1.jiraService.getIssue(bugKey);
            if (issueDetails) {
                const rawFields = issueDetails.fields;
                if (rawFields.timetracking !== undefined) {
                    console.log('✅ [PASS] "timetracking" field IS present in getIssue details.');
                    console.log('   Value:', JSON.stringify(rawFields.timetracking, null, 2));
                }
                else {
                    console.error('❌ [FAIL] "timetracking" field is MISSING in getIssue details.');
                }
            }
            else {
                console.error('❌ Failed to fetch issue details.');
            }
        }
        // Test 3: Fetch Sprint Issues (The original problem area)
        // We need a board and sprint. We'll try to find one dynamically.
        console.log('\n🔍 Test 3: Verifying Sprint Issue List...');
        const boards = await JiraService_1.jiraService.getBoards();
        if (boards.length > 0) {
            const board = boards[0];
            console.log(`   Using Board: ${board.name} (${board.id})`);
            const sprints = await JiraService_1.jiraService.getSprints(board.id);
            if (sprints.length > 0) {
                // Find a sprint that likely has issues (Active or Closed preferred, or typically the last one)
                const sprint = sprints[sprints.length - 1];
                console.log(`   Using Sprint: ${sprint.name} (${sprint.id})`);
                const sprintIssues = await JiraService_1.jiraService.getSprintIssues(sprint.id, 5); // Just fetch 5
                console.log(`   Fetched ${sprintIssues.length} issues.`);
                // Check the first one that is a Bug, or just check the first one period
                const bugInSprint = sprintIssues.find((i) => i.fields.issuetype?.name === 'Bug');
                if (bugInSprint) {
                    console.log(`   Found Bug in Sprint: ${bugInSprint.key}`);
                    if (bugInSprint.fields.timetracking !== undefined) {
                        console.log('✅ [PASS] "timetracking" field IS present in getSprintIssues for Bugs.');
                    }
                    else {
                        console.error('❌ [FAIL] "timetracking" field is MISSING in getSprintIssues for Bugs.');
                    }
                }
                else {
                    // Check any issue just in case, though timetracking is mostly for bugs/stories
                    if (sprintIssues.length > 0) {
                        const first = sprintIssues[0];
                        if (first.fields.timetracking !== undefined) {
                            console.log(`✅ [PASS] "timetracking" field IS present in getSprintIssues (checked ${first.key}).`);
                        }
                        else {
                            // It might be undefined if the issue doesn't have it, but the KEY should be allowed.
                            // We really want to verify the NETWORK REQUEST included it.
                            // Since we can't see the network request here easily, we rely on the field existing in the object if populated.
                            console.log(`ℹ️ "timetracking" not found in ${first.key} (might be empty or wrong type).`);
                        }
                    }
                }
            }
            else {
                console.warn('⚠️ No Sprints found on first board. Skipping Test 3.');
            }
        }
        else {
            console.warn('⚠️ No Boards found. Skipping Test 3.');
        }
    }
    catch (error) {
        console.error('❌ Error running verification:', error);
    }
}
verifyTimetracking();
