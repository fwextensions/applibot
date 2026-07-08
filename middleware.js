// Vercel Edge Middleware — simple password gate for testers.
// Set the APPLIBOT_PASSWORD environment variable in Vercel project settings.

export const config = {
	matcher: ['/((?!api-full|api-prod|_vercel|favicon.ico).*)'],
};

const LOGIN_PAGE = (error = '') => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Applibot – Login</title>
<style>
	body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f3f4f6; }
	.card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); width: 100%; max-width: 360px; }
	h1 { margin: 0 0 1rem; font-size: 1.25rem; }
	input { width: 100%; padding: 0.5rem; margin-bottom: 1rem; border: 1px solid #d1d5db; border-radius: 4px; box-sizing: border-box; }
	button { width: 100%; padding: 0.5rem; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
	button:hover { background: #1d4ed8; }
	.error { color: #dc2626; font-size: 0.875rem; margin-bottom: 0.75rem; }
</style>
</head>
<body>
<div class="card">
	<h1>Applibot</h1>
	<p>Enter the password to continue.</p>
	${error ? `<p class="error">${error}</p>` : ''}
	<form method="POST">
		<input type="password" name="password" placeholder="Password" autofocus required />
		<button type="submit">Log in</button>
	</form>
</div>
</body>
</html>`;

export default async function middleware(request) {
	const password = process.env.APPLIBOT_PASSWORD;

	// If no password is configured, allow access (local dev / unconfigured).
	if (!password) {
		return;
	}

	// Handle form POST (password submission).
	if (request.method === 'POST') {
		const formData = await request.formData();
		const submitted = formData.get('password');

		if (submitted === password) {
			// Set auth cookie and redirect to the original page.
			const url = new URL(request.url);
			return new Response(null, {
				status: 302,
				headers: {
					Location: url.pathname,
					'Set-Cookie': `applibot_auth=${encodeURIComponent(password)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
				},
			});
		}

		// Wrong password — show error.
		return new Response(LOGIN_PAGE('Incorrect password.'), {
			status: 401,
			headers: { 'Content-Type': 'text/html' },
		});
	}

	// Check for auth cookie on GET requests.
	const cookie = request.headers.get('cookie') || '';
	const match = cookie.match(/applibot_auth=([^;]+)/);

	if (match && decodeURIComponent(match[1]) === password) {
		return; // Authenticated — continue to the app.
	}

	// Not authenticated — show login page.
	return new Response(LOGIN_PAGE(), {
		status: 401,
		headers: { 'Content-Type': 'text/html' },
	});
}
