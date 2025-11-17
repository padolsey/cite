<script lang="ts">
	import { createClient } from '$lib/auth/supabase-client';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen = $bindable(false), onClose }: Props = $props();

	let email = $state('');
	let password = $state('');
	let viewMode = $state<'magic-link' | 'signin' | 'signup'>('magic-link');
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let loading = $state(false);

	const supabase = createClient();

	async function handleMagicLink(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = null;
		success = null;

		try {
			const { error: err } = await supabase.auth.signInWithOtp({
				email,
				options: {
					emailRedirectTo: `${window.location.origin}/account`
				}
			});

			if (err) {
				error = err.message;
			} else {
				success = `Magic link sent to ${email}! Check your inbox and click the link to sign in.`;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	async function handleSignUp(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = null;
		success = null;

		try {
			const { error: err } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${window.location.origin}/account`
				}
			});

			if (err) {
				error = err.message;
			} else {
				success = 'Account created! Please check your email to confirm your account.';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	async function handleSignIn(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = null;
		success = null;

		try {
			const { error: err } = await supabase.auth.signInWithPassword({
				email,
				password
			});

			if (err) {
				error = err.message;
			} else {
				success = 'Signed in successfully!';
				setTimeout(() => {
					window.location.href = '/account';
				}, 500);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function handleClose() {
		if (!loading) {
			onClose();
			// Reset state after modal closes
			setTimeout(() => {
				email = '';
				password = '';
				error = null;
				success = null;
				viewMode = 'magic-link';
			}, 200);
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		onclick={handleBackdropClick}
		role="button"
		tabindex="-1"
	>
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-2xl font-bold text-gray-900">
					{viewMode === 'magic-link' ? 'Get Started' : viewMode === 'signup' ? 'Create Account' : 'Sign In'}
				</h2>
				<button
					onclick={handleClose}
					disabled={loading}
					class="text-gray-400 hover:text-gray-600 disabled:opacity-50"
					aria-label="Close modal"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			{#if error}
				<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
					<p class="text-sm text-red-800">{error}</p>
				</div>
			{/if}

			{#if success}
				<div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
					<p class="text-sm text-green-800">{success}</p>
				</div>
			{/if}

			{#if viewMode === 'magic-link'}
				<form onsubmit={handleMagicLink}>
					<div class="mb-4">
						<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
							Email address
						</label>
						<input
							type="email"
							id="email"
							bind:value={email}
							required
							disabled={loading}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
							placeholder="you@example.com"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{loading ? 'Sending...' : 'Send Magic Link'}
					</button>

					<div class="mt-4 text-center">
						<button
							type="button"
							onclick={() => (viewMode = 'signup')}
							disabled={loading}
							class="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
						>
							Or create account with password
						</button>
					</div>

					<div class="mt-2 text-center">
						<button
							type="button"
							onclick={() => (viewMode = 'signin')}
							disabled={loading}
							class="text-sm text-gray-600 hover:text-gray-700 disabled:opacity-50"
						>
							Already have an account? Sign in
						</button>
					</div>
				</form>
			{:else if viewMode === 'signup'}
				<form onsubmit={handleSignUp}>
					<div class="mb-4">
						<label for="email-signup" class="block text-sm font-medium text-gray-700 mb-2">
							Email address
						</label>
						<input
							type="email"
							id="email-signup"
							bind:value={email}
							required
							disabled={loading}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
							placeholder="you@example.com"
						/>
					</div>

					<div class="mb-4">
						<label for="password-signup" class="block text-sm font-medium text-gray-700 mb-2">
							Password
						</label>
						<input
							type="password"
							id="password-signup"
							bind:value={password}
							required
							disabled={loading}
							minlength="6"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
							placeholder="••••••••"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{loading ? 'Creating...' : 'Create Account'}
					</button>

					<div class="mt-4 text-center">
						<button
							type="button"
							onclick={() => (viewMode = 'magic-link')}
							disabled={loading}
							class="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
						>
							Use magic link instead
						</button>
					</div>

					<div class="mt-2 text-center">
						<button
							type="button"
							onclick={() => (viewMode = 'signin')}
							disabled={loading}
							class="text-sm text-gray-600 hover:text-gray-700 disabled:opacity-50"
						>
							Already have an account? Sign in
						</button>
					</div>
				</form>
			{:else}
				<form onsubmit={handleSignIn}>
					<div class="mb-4">
						<label for="email-signin" class="block text-sm font-medium text-gray-700 mb-2">
							Email address
						</label>
						<input
							type="email"
							id="email-signin"
							bind:value={email}
							required
							disabled={loading}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
							placeholder="you@example.com"
						/>
					</div>

					<div class="mb-4">
						<label for="password-signin" class="block text-sm font-medium text-gray-700 mb-2">
							Password
						</label>
						<input
							type="password"
							id="password-signin"
							bind:value={password}
							required
							disabled={loading}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
							placeholder="••••••••"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{loading ? 'Signing in...' : 'Sign In'}
					</button>

					<div class="mt-4 text-center">
						<button
							type="button"
							onclick={() => (viewMode = 'magic-link')}
							disabled={loading}
							class="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
						>
							Use magic link instead
						</button>
					</div>

					<div class="mt-2 text-center">
						<button
							type="button"
							onclick={() => (viewMode = 'signup')}
							disabled={loading}
							class="text-sm text-gray-600 hover:text-gray-700 disabled:opacity-50"
						>
							Don't have an account? Sign up
						</button>
					</div>
				</form>
			{/if}

			<div class="mt-6 pt-6 border-t border-gray-200">
				<p class="text-xs text-gray-500 text-center">
					By signing up, you'll receive an API key to integrate CITE safety measures into your application.
				</p>
			</div>
		</div>
	</div>
{/if}
