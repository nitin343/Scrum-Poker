
const io = require("socket.io-client");

const SOCKET_URL = "http://localhost:3001";

const socket1 = io(SOCKET_URL);
const socket2 = io(SOCKET_URL);

const ROOM_ID = "TEST_ROOM_" + Math.floor(Math.random() * 1000);

console.log("Starting Verification Script (CJS)...");

function runTest() {
    return new Promise((resolve, reject) => {
        let masterReceivedUpdate = false;
        let memberReceivedUpdate = false;
        let revealReceived = false;

        // --- Socket 1 (Scrum Master) ---
        socket1.on("connect", () => {
            console.log("Master connected");
            socket1.emit("join_room", { roomId: ROOM_ID, userId: "USER_MASTER", displayName: "Master", isScrumMaster: true });
        });

        socket1.on("room_update", (room) => {
            console.log("Master received room update:", room.participants.length, "participants");
            if (room.participants.length === 2 && !masterReceivedUpdate) {
                masterReceivedUpdate = true;
                console.log("Both users present. Master voting...");
                socket1.emit("select_card", { roomId: ROOM_ID, userId: "USER_MASTER", card: 5 });
            }
        });

        socket1.on("cards_revealed", (data) => {
            console.log("Master received reveal:", JSON.stringify(data.participants.map(p => ({ id: p.userId, card: p.selectedCard }))));
            revealReceived = true;
            if (masterReceivedUpdate && memberReceivedUpdate && revealReceived) {
                console.log("SUCCESS: Flow verified.");
                resolve();
            }
        });

        // --- Socket 2 (Member) ---
        socket2.on("connect", () => {
            console.log("Member connected");
            setTimeout(() => {
                socket2.emit("join_room", { roomId: ROOM_ID, userId: "USER_MEMBER", displayName: "Member", isScrumMaster: false });
            }, 500);
        });

        socket2.on("vote_update", (data) => {
            if (data.userId === "USER_MASTER") {
                console.log("Member sees Master voted. Member voting...");
                socket2.emit("select_card", { roomId: ROOM_ID, userId: "USER_MEMBER", card: 8 });
            }
            if (data.userId === "USER_MEMBER") {
                // Both voted, trigger reveal from Master
                setTimeout(() => {
                    console.log("Triggering reveal...");
                    socket1.emit("reveal_cards", { roomId: ROOM_ID });
                }, 500);
                memberReceivedUpdate = true;
            }
        });

        setTimeout(() => {
            reject(new Error("Timeout waiting for test completion"));
        }, 5000);
    });
}

runTest()
    .then(() => {
        console.log("Test Passed!");
        socket1.disconnect();
        socket2.disconnect();
        process.exit(0);
    })
    .catch((err) => {
        console.error("Test Failed:", err);
        socket1.disconnect();
        socket2.disconnect();
        process.exit(1);
    });
