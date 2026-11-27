import type { Product, TaxSetting } from './types';

/** Apply branch overrides for POS pricing and availability. Does not mutate the catalog product. */
export function resolveProduct(product: Product, branchId: string): Product {
	const override = product.branchOverrides?.find((row) => row.branchId === branchId);
	if (!override) return product;
	return {
		...product,
		available: override.available ?? product.available,
		basePrice: override.basePrice ?? product.basePrice
	};
}

export function resolveTaxForProducts(
	products: Product[],
	taxCategories: TaxSetting[],
	fallback: TaxSetting
): TaxSetting {
	const ids = [...new Set(products.map((product) => product.taxCategoryId).filter(Boolean))];
	if (ids.length !== 1) return fallback;
	const match = taxCategories.find((tax) => tax.id === ids[0] && tax.active);
	return match ?? fallback;
}

export function upsertBranchOverride(
	overrides: Product['branchOverrides'] | undefined,
	branchId: string,
	patch: { available?: boolean | null; basePrice?: number | null }
): Product['branchOverrides'] {
	const list = [...(overrides ?? [])];
	const index = list.findIndex((row) => row.branchId === branchId);
	const current = index >= 0 ? list[index] : { branchId };
	const next = { ...current, branchId };

	if (patch.available === null) delete next.available;
	else if (patch.available !== undefined) next.available = patch.available;

	if (patch.basePrice === null) delete next.basePrice;
	else if (patch.basePrice !== undefined) next.basePrice = patch.basePrice;

	const hasOverride = next.available !== undefined || next.basePrice !== undefined;
	if (!hasOverride) {
		if (index >= 0) list.splice(index, 1);
		return list;
	}
	if (index >= 0) list[index] = next;
	else list.push(next);
	return list;
}
