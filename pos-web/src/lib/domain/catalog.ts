import type { CartLine, LocaleText, ModifierGroup, Product, SelectedModifier } from './types';

/** Option ids that are “normal” and clutter cart/CDS summaries when shown. */
const HIDDEN_SUMMARY_OPTION_IDS = new Set([
	'temp_hot',
	'milk_regular',
	'ice_regular',
	'sugar_100',
	'spice_mild',
	'done_medium',
	'side_rice',
	'noodle_egg'
]);

/** Labels for summary — omit defaults / zero-price “regular” choices. */
export function modifierSummaryLabels(
	mods: SelectedModifier[],
	pick: (text: LocaleText) => string
): string[] {
	return mods
		.filter((item) => {
			if (item.priceDelta !== 0) return true;
			if (HIDDEN_SUMMARY_OPTION_IDS.has(item.optionId)) return false;
			return true;
		})
		.map((item) => pick(item.optionName));
}

export function modifierSummaryText(
	mods: SelectedModifier[],
	pick: (text: LocaleText) => string,
	sep = ' · '
): string {
	return modifierSummaryLabels(mods, pick).join(sep);
}

export function unitPrice(base: number, deltas: number[]): number {
	return Math.max(0, Math.round(base) + deltas.reduce((sum, delta) => sum + Math.round(delta), 0));
}

export function lineKey(productId: string, optionIds: string[], note: string): string {
	return `${productId}|${[...optionIds].sort().join(',')}|${note.trim()}`;
}

export function lineIdentity(line: CartLine): string {
	return lineKey(
		line.productId,
		line.selectedModifiers.map((modifier) => modifier.optionId),
		line.specialInstructions ?? ''
	);
}

export function visibleGroups(
	product: Product,
	groups: ModifierGroup[],
	selectedOptionIds: string[]
): ModifierGroup[] {
	const iced = selectedOptionIds.includes('temp_iced');
	const hasTemperature = product.modifierGroupIds.includes('mod_temp');
	return groups
		.filter((group) => group.active && product.modifierGroupIds.includes(group.id))
		.filter((group) => (group.id === 'mod_ice' ? !hasTemperature || iced : true))
		.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function defaultOptionIds(product: Product, groups: ModifierGroup[]): string[] {
	const ids: string[] = [];
	for (const group of groups) {
		if (!group.active || !product.modifierGroupIds.includes(group.id)) continue;
		if (group.id === 'mod_ice' && product.modifierGroupIds.includes('mod_temp')) continue;
		if (group.selectionMode !== 'SINGLE') continue;
		const preferred = group.options.find((option) => option.active && option.isDefault);
		if (preferred) ids.push(preferred.id);
	}
	return ids;
}

export function selectionError(
	product: Product,
	groups: ModifierGroup[],
	optionIds: string[]
): 'required' | 'max' | null {
	for (const group of visibleGroups(product, groups, optionIds)) {
		const count = optionIds.filter((id) => group.options.some((option) => option.id === id && option.active)).length;
		const min = group.required ? Math.max(group.minSelections, 1) : group.minSelections;
		if (count < min && (group.required || count > 0)) return 'required';
		if (count > group.maxSelections) return 'max';
		if (group.selectionMode === 'SINGLE' && count > 1) return 'max';
	}
	return null;
}

export function selectionFrom(groups: ModifierGroup[], optionIds: string[]): SelectedModifier[] {
	const selected: SelectedModifier[] = [];
	for (const group of groups) {
		for (const option of group.options) {
			if (!optionIds.includes(option.id) || !option.active) continue;
			selected.push({
				groupId: group.id,
				groupName: group.name,
				optionId: option.id,
				optionName: option.name,
				priceDelta: option.priceDelta
			});
		}
	}
	return selected;
}

export function makeLine(
	product: Product,
	quantity: number,
	selected: SelectedModifier[],
	note = ''
): CartLine {
	const qty = Math.max(1, Math.round(quantity));
	const unit = unitPrice(
		product.basePrice,
		selected.map((modifier) => modifier.priceDelta)
	);
	return {
		id: crypto.randomUUID(),
		productId: product.id,
		sku: product.sku,
		erpItemId: product.erpItemId,
		productName: { ...product.name },
		productImageUrl: product.imageUrl,
		categoryId: product.categoryId,
		preparesInKitchen: product.preparesInKitchen,
		/** Until Step 3 prep stations: category id is the station snapshot. */
		stationId: product.preparesInKitchen ? product.categoryId : undefined,
		baseUnitPrice: product.basePrice,
		selectedModifiers: selected.map((modifier) => ({
			...modifier,
			groupName: { ...modifier.groupName },
			optionName: { ...modifier.optionName }
		})),
		specialInstructions: note.trim() || undefined,
		quantity: qty,
		unitPrice: unit,
		lineTotal: unit * qty
	};
}
