#!/usr/bin/env node
/**
 * Installation script for Sekkei skills in Claude Code.
 * Copies SKILL.md and references/ to ~/.claude/skills/sekkei/
 */
import { mkdir, cp } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME || process.env.USERPROFILE;
const CLAUDE_SKILLS_DIR = join(HOME, '.claude', 'skills', 'sekkei');
const CONTENT_SRC = join(__dirname, '..', 'content');

async function install() {
    console.log('Installing Sekkei skills for Claude Code...');
    console.log(`Target: ${CLAUDE_SKILLS_DIR}`);

    try {
        // Ensure the target directory exists
        await mkdir(CLAUDE_SKILLS_DIR, { recursive: true });

        // Copy SKILL.md and references/
        await cp(CONTENT_SRC, CLAUDE_SKILLS_DIR, { recursive: true });

        console.log('✅ Sekkei skills installed successfully!');
        console.log('\nRestart Claude Code to use the new skills.');
        console.log('Then run "npx sekkei init" in your project folder to start.');
    } catch (err) {
        console.error('❌ Failed to install Sekkei skills:', err.message);
        process.exit(1);
    }
}

install();
