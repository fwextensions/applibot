#!/usr/bin/env node
// Analyzes preference combinations across lottery data files in data/

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "../data");

const files = readdirSync(dataDir).filter(f => f.endsWith(".json"));

for (const file of files) {
	console.log(`\n=== ${file} ===`);
	const raw = JSON.parse(readFileSync(join(dataDir, file), "utf8"));
	const records = raw.records || [];

	// Build map: lottery_number -> Set of preference_names
	const appPrefs = new Map();
	for (const record of records) {
		const lotteryNum = record.application?.lottery_number;
		const prefName = record.preference_name;
		if (!lotteryNum || !prefName) continue;

		if (!appPrefs.has(lotteryNum)) appPrefs.set(lotteryNum, new Set());
		appPrefs.get(lotteryNum).add(prefName);
	}

	// Count unique combos
	const comboCounts = new Map();
	for (const prefs of appPrefs.values()) {
		const key = [...prefs].sort().join(" + ");
		comboCounts.set(key, (comboCounts.get(key) || 0) + 1);
	}

	// Sort by count descending
	const sorted = [...comboCounts.entries()].sort((a, b) => b[1] - a[1]);

	const total = appPrefs.size;
	console.log(`Total applicants with preferences: ${total}`);
	console.log(`Unique combinations: ${sorted.length}\n`);
	console.log("Count  | %     | Combination");
	console.log("-------|-------|------------");
	for (const [combo, count] of sorted) {
		const pct = ((count / total) * 100).toFixed(1).padStart(5);
		console.log(`${String(count).padStart(6)} | ${pct}% | ${combo}`);
	}
}
