"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const jira_1 = __importDefault(require("./jira"));
const sessions_1 = __importDefault(require("./sessions"));
const sprints_1 = __importDefault(require("./sprints"));
const router = (0, express_1.Router)();
// API v1 routes
router.use('/auth', auth_1.default);
router.use('/jira', jira_1.default);
router.use('/sessions', sessions_1.default);
router.use('/sprints', sprints_1.default);
exports.default = router;
