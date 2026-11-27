<script lang="ts">
	/**
	 * Shared textbox — uses `.field` styles + app-wide ring click (ទឹករលក).
	 * Prefer this over raw `<input class="field">` for new UI; existing `.field`
	 * inputs still get the effect via Shell `installFieldInkWave`.
	 */
	let {
		id,
		value = $bindable(''),
		type = 'text',
		disabled = false,
		placeholder = '',
		ariaLabel,
		class: klass = '',
		inputmode,
		autocomplete,
		name,
		readonly = false,
		onchange,
		oninput
	}: {
		id?: string;
		value?: string;
		type?: 'text' | 'search' | 'tel' | 'email' | 'password' | 'url';
		disabled?: boolean;
		placeholder?: string;
		ariaLabel?: string;
		class?: string;
		inputmode?: 'text' | 'search' | 'tel' | 'email' | 'url' | 'numeric' | 'decimal' | 'none';
		autocomplete?: string;
		name?: string;
		readonly?: boolean;
		onchange?: (value: string) => void;
		oninput?: (value: string) => void;
	} = $props();
</script>

<input
	{id}
	{name}
	{type}
	{disabled}
	{placeholder}
	{inputmode}
	{autocomplete}
	{readonly}
	class="field {klass}"
	aria-label={ariaLabel}
	bind:value
	oninput={(event) => {
		const next = (event.currentTarget as HTMLInputElement).value;
		oninput?.(next);
	}}
	onchange={(event) => {
		const next = (event.currentTarget as HTMLInputElement).value;
		onchange?.(next);
	}}
/>
