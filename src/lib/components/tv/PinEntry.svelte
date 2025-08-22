<script>
	let { tvName, onPinSubmit, error = '' } = $props();

	let pin = $state('');
	let loading = $state(false);

	function handleInput(event) {
		const value = event.target.value.replace(/\D/g, ''); // Only digits
		if (value.length <= 4) {
			pin = value;
		}
	}

	function handleSubmit() {
		if (pin.length !== 4) {
			return;
		}
		
		loading = true;
		onPinSubmit?.(pin).finally(() => {
			loading = false;
		});
	}

	function handleKeydown(event) {
		if (event.key === 'Enter' && pin.length === 4) {
			handleSubmit();
		}
	}

	// Auto-submit when 4 digits are entered
	$effect(() => {
		if (pin.length === 4) {
			setTimeout(() => {
				if (pin.length === 4) { // Double check in case user is still typing
					handleSubmit();
				}
			}, 500);
		}
	});
</script>

<div class="pin-entry-screen">
	<div class="pin-entry-container">
		<div class="tv-info">
			<div class="tv-icon">📺</div>
			<h1>{tvName}</h1>
			<p>Enter the 4-digit PIN to access this TV</p>
		</div>

		<div class="pin-form">
			<div class="pin-input-container">
				<input
					type="text"
					bind:value={pin}
					oninput={handleInput}
					onkeydown={handleKeydown}
					placeholder="****"
					maxlength="4"
					class="pin-input"
					class:error={error}
					disabled={loading}
					autocomplete="off"
					inputmode="numeric"
				/>
				<div class="pin-dots">
					{#each Array(4) as _, i}
						<div class="pin-dot" class:filled={pin.length > i}></div>
					{/each}
				</div>
			</div>

			{#if error}
				<div class="error-message">
					{error}
				</div>
			{/if}

			<button 
				class="submit-btn"
				onclick={handleSubmit}
				disabled={pin.length !== 4 || loading}
			>
				{loading ? 'Checking...' : 'Access TV'}
			</button>

			<div class="pin-pad">
				{#each Array(9) as _, i}
					<button 
						class="pin-pad-btn"
						onclick={() => {
							if (pin.length < 4) {
								pin += (i + 1).toString();
							}
						}}
						disabled={loading || pin.length >= 4}
					>
						{i + 1}
					</button>
				{/each}
				<button 
					class="pin-pad-btn clear-btn"
					onclick={() => pin = ''}
					disabled={loading}
				>
					Clear
				</button>
				<button 
					class="pin-pad-btn"
					onclick={() => {
						if (pin.length < 4) {
							pin += '0';
						}
					}}
					disabled={loading || pin.length >= 4}
				>
					0
				</button>
				<button 
					class="pin-pad-btn backspace-btn"
					onclick={() => pin = pin.slice(0, -1)}
					disabled={loading || pin.length === 0}
				>
					⌫
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.pin-entry-screen {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
		padding: 2rem;
	}

	.pin-entry-container {
		background: white;
		border-radius: 16px;
		padding: 3rem 2rem;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
		text-align: center;
		max-width: 400px;
		width: 100%;
	}

	.tv-info {
		margin-bottom: 2rem;
	}

	.tv-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.tv-info h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.tv-info p {
		color: #6b7280;
		margin: 0;
	}

	.pin-input-container {
		position: relative;
		margin-bottom: 1rem;
	}

	.pin-input {
		width: 100%;
		padding: 1rem;
		font-size: 2rem;
		text-align: center;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		letter-spacing: 1rem;
		font-family: monospace;
		background: transparent;
		color: transparent;
		caret-color: transparent;
	}

	.pin-input:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.pin-input.error {
		border-color: #ef4444;
		animation: shake 0.5s ease-in-out;
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-5px); }
		75% { transform: translateX(5px); }
	}

	.pin-dots {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		gap: 1rem;
		pointer-events: none;
	}

	.pin-dot {
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		border: 2px solid #d1d5db;
		background: white;
		transition: all 0.2s;
	}

	.pin-dot.filled {
		background: #3b82f6;
		border-color: #3b82f6;
	}

	.error-message {
		color: #ef4444;
		font-size: 0.875rem;
		margin-bottom: 1rem;
		padding: 0.5rem;
		background: #fef2f2;
		border-radius: 4px;
	}

	.submit-btn {
		width: 100%;
		background: #3b82f6;
		color: white;
		border: none;
		padding: 1rem;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		margin-bottom: 2rem;
	}

	.submit-btn:hover:not(:disabled) {
		background: #2563eb;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pin-pad {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		max-width: 240px;
		margin: 0 auto;
	}

	.pin-pad-btn {
		aspect-ratio: 1;
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 1.25rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		color: #374151;
	}

	.pin-pad-btn:hover:not(:disabled) {
		background: #e5e7eb;
		transform: scale(1.05);
	}

	.pin-pad-btn:active {
		transform: scale(0.95);
	}

	.pin-pad-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pin-pad-btn.clear-btn {
		background: #fef2f2;
		color: #dc2626;
		border-color: #fecaca;
	}

	.pin-pad-btn.clear-btn:hover:not(:disabled) {
		background: #fee2e2;
	}

	.pin-pad-btn.backspace-btn {
		background: #f0f9ff;
		color: #0369a1;
		border-color: #bae6fd;
	}

	.pin-pad-btn.backspace-btn:hover:not(:disabled) {
		background: #e0f2fe;
	}

	@media (max-width: 480px) {
		.pin-entry-screen {
			padding: 1rem;
		}

		.pin-entry-container {
			padding: 2rem 1.5rem;
		}

		.tv-icon {
			font-size: 3rem;
		}

		.tv-info h1 {
			font-size: 1.25rem;
		}

		.pin-input {
			font-size: 1.5rem;
			letter-spacing: 0.75rem;
		}

		.pin-dots {
			gap: 0.75rem;
		}

		.pin-dot {
			width: 0.75rem;
			height: 0.75rem;
		}

		.pin-pad {
			gap: 0.5rem;
			max-width: 200px;
		}

		.pin-pad-btn {
			font-size: 1rem;
		}
	}
</style>
