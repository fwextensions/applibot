#!/usr/bin/env node

import { exec, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const defaultUrl = process.env.APPLIBOT_URL ?? "http://localhost:5173";
const npmExecPath = process.env.npm_execpath;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const devProcess = npmExecPath
	? spawn(process.execPath, [npmExecPath, "run", "dev"], {
		cwd: projectRoot,
		stdio: ["inherit", "pipe", "pipe"],
	})
	: spawn(npmCommand, ["run", "dev"], {
		cwd: projectRoot,
		stdio: ["inherit", "pipe", "pipe"],
	});

function openBrowser(targetUrl) {
	const platform = process.platform;
	if (platform === "win32") {
		exec(`start "" "${targetUrl}"`, { cwd: projectRoot, windowsHide: true });
		return;
	}

	if (platform === "darwin") {
		exec(`open "${targetUrl}"`);
		return;
	}

	exec(`xdg-open "${targetUrl}"`);
}

let browserOpened = false;
let openTimer;

function stripAnsi(input) {
	return input.replace(
		/[\u001B\u009B][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PR-TZcf-nq-uy=><~]/g,
		"",
	);
}

function maybeOpen(targetUrl) {
	if (browserOpened || process.env.APPLIBOT_NO_OPEN) {
		return;
	}
	browserOpened = true;
	openBrowser(targetUrl);
}

if (devProcess.stdout) {
	devProcess.stdout.on("data", (chunk) => {
		process.stdout.write(chunk);
		if (browserOpened || process.env.APPLIBOT_NO_OPEN) {
			return;
		}
		const text = stripAnsi(chunk.toString());
		const match = text.match(/https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/?/);
		if (match) {
			maybeOpen(match[0]);
		}
	});
}

if (devProcess.stderr) {
	devProcess.stderr.on("data", (chunk) => {
		process.stderr.write(chunk);
	});
}

if (!process.env.APPLIBOT_NO_OPEN) {
	const delay = Number(process.env.APPLIBOT_OPEN_DELAY ?? 2000);
	openTimer = setTimeout(() => {
		if (!browserOpened) {
			maybeOpen(defaultUrl);
		}
	}, delay);
}

devProcess.on("exit", (code) => {
	if (openTimer) {
		clearTimeout(openTimer);
	}
	process.exit(code ?? 0);
});
