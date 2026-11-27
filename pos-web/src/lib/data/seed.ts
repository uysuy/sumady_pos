import { makeLine, selectionFrom } from '$lib/domain/catalog';
import { priceCart } from '$lib/domain/money';
import type {
	Cart,
	CartLine,
	CashShift,
	Category,
	Customer,
	DemoAppState,
	DiscountMode,
	KitchenStatus,
	ModifierGroup,
	Order,
	OrderStatus,
	OrderType,
	OutboxRecord,
	PaymentMethod,
	PaymentStatus,
	Product,
	SyncState,
	TimelineEvent
} from '$lib/domain/types';

const L = (en: string, kh: string) => ({ en, kh });

const drinkGroups = ['mod_size', 'mod_temp', 'mod_milk', 'mod_sugar', 'mod_ice', 'mod_extras'];
const icedGroups = ['mod_size', 'mod_ice', 'mod_milk', 'mod_sugar', 'mod_extras'];
const foodSpiceGroups = ['mod_spice', 'mod_side'];
const grillGroups = ['mod_doneness', 'mod_side'];
const cocktailGroups = ['mod_ice', 'mod_garnish'];
const noodleGroups = ['mod_spice', 'mod_noodle'];

export const categories: Category[] = [
	{ id: 'cat_coffee', name: L('Coffee', 'កាហ្វេ'), description: L('Café espresso bar', 'តុកាហ្វេ'), sortOrder: 1, active: true },
	{ id: 'cat_tea', name: L('Tea', 'តែ'), description: L('Tea and matcha', 'តែ និងម៉ាឆា'), sortOrder: 2, active: true },
	{ id: 'cat_noncoffee', name: L('Non-Coffee', 'មិនមែនកាហ្វេ'), description: L('Chocolate and coolers', 'សូកូឡា និងភេសជ្ជៈត្រជាក់'), sortOrder: 3, active: true },
	{ id: 'cat_cold', name: L('Cold Drinks', 'ភេសជ្ជៈត្រជាក់'), description: L('Iced coffee & sodas', 'កាហ្វេទឹកកក'), sortOrder: 4, active: true },
	{ id: 'cat_bakery', name: L('Bakery', 'នំបុ័ង'), description: L('Baked this morning', 'អាំងព្រឹកនេះ'), sortOrder: 5, active: true },
	{ id: 'cat_pastries', name: L('Pastries', 'នំផ្អែម'), description: L('Cakes and sweets', 'នំខេក និងបង្អែម'), sortOrder: 6, active: true },
	{ id: 'cat_food', name: L('Food', 'ម្ហូប'), description: L('Meals, bowls & plates', 'ម្ហូប និងចាន'), sortOrder: 7, active: true },
	{ id: 'cat_starters', name: L('Starters', 'ម្ហូបចាប់ផ្តើម'), description: L('Restaurant starters', 'ម្ហូបចាប់ផ្តើម'), sortOrder: 8, active: true },
	{ id: 'cat_mains', name: L('Mains', 'ម្ហូបមុខ'), description: L('Restaurant mains', 'ម្ហូបភោជនីយដ្ឋាន'), sortOrder: 9, active: true },
	{ id: 'cat_grill', name: L('Grill', 'សាច់អាំង'), description: L('Grill & steak', 'សាច់អាំង'), sortOrder: 10, active: true },
	{ id: 'cat_noodles', name: L('Noodles', 'មី'), description: L('Noodles & bowls', 'មី និងចាន'), sortOrder: 11, active: true },
	{ id: 'cat_desserts', name: L('Desserts', 'បង្អែម'), description: L('Restaurant desserts', 'បង្អែមភោជនីយដ្ឋាន'), sortOrder: 12, active: true },
	{ id: 'cat_skybar', name: L('Skybar', 'ស្កាយបារ'), description: L('Cocktails & night drinks', 'កុកតែល'), sortOrder: 13, active: true },
	{ id: 'cat_bar_snacks', name: L('Bar Bites', 'អាហារបារ'), description: L('Skybar snacks', 'អាហារសម្រន់បារ'), sortOrder: 14, active: true }
];

export const modifierGroups: ModifierGroup[] = [
	{
		id: 'mod_size',
		name: L('Size', 'ទំហំ'),
		selectionMode: 'SINGLE',
		required: true,
		minSelections: 1,
		maxSelections: 1,
		active: true,
		sortOrder: 1,
		options: [
			{ id: 'size_s', name: L('Small', 'តូច'), priceDelta: 0, active: true, isDefault: true, sortOrder: 1 },
			{ id: 'size_m', name: L('Medium', 'មធ្យម'), priceDelta: 50, active: true, sortOrder: 2 },
			{ id: 'size_l', name: L('Large', 'ធំ'), priceDelta: 100, active: true, sortOrder: 3 }
		]
	},
	{
		id: 'mod_temp',
		name: L('Temperature', 'សីតុណ្ហភាព'),
		selectionMode: 'SINGLE',
		required: true,
		minSelections: 1,
		maxSelections: 1,
		active: true,
		sortOrder: 2,
		options: [
			{ id: 'temp_hot', name: L('Hot', 'ក្តៅ'), priceDelta: 0, active: true, isDefault: true, sortOrder: 1 },
			{ id: 'temp_iced', name: L('Iced', 'ទឹកកក'), priceDelta: 0, active: true, sortOrder: 2 }
		]
	},
	{
		id: 'mod_milk',
		name: L('Milk', 'ទឹកដោះគោ'),
		selectionMode: 'SINGLE',
		required: false,
		minSelections: 0,
		maxSelections: 1,
		active: true,
		sortOrder: 3,
		options: [
			{ id: 'milk_regular', name: L('Regular', 'ធម្មតា'), priceDelta: 0, active: true, isDefault: true, sortOrder: 1 },
			{ id: 'milk_oat', name: L('Oat', 'អូត'), priceDelta: 50, active: true, sortOrder: 2 },
			{ id: 'milk_soy', name: L('Soy', 'សណ្តែក'), priceDelta: 50, active: true, sortOrder: 3 },
			{ id: 'milk_almond', name: L('Almond', 'អាល់ម៉ុន'), priceDelta: 75, active: true, sortOrder: 4 }
		]
	},
	{
		id: 'mod_sugar',
		name: L('Sugar', 'ស្ករ'),
		selectionMode: 'SINGLE',
		required: false,
		minSelections: 0,
		maxSelections: 1,
		active: true,
		sortOrder: 4,
		options: [
			{ id: 'sugar_100', name: L('100%', '១០០%'), priceDelta: 0, active: true, isDefault: true, sortOrder: 1 },
			{ id: 'sugar_70', name: L('70%', '៧០%'), priceDelta: 0, active: true, sortOrder: 2 },
			{ id: 'sugar_50', name: L('50%', '៥០%'), priceDelta: 0, active: true, sortOrder: 3 },
			{ id: 'sugar_0', name: L('0%', '០%'), priceDelta: 0, active: true, sortOrder: 4 }
		]
	},
	{
		id: 'mod_ice',
		name: L('Ice', 'ទឹកកក'),
		selectionMode: 'SINGLE',
		required: true,
		minSelections: 1,
		maxSelections: 1,
		active: true,
		sortOrder: 5,
		options: [
			{ id: 'ice_extra', name: L('Extra', 'ច្រើន'), priceDelta: 0, active: true, sortOrder: 1 },
			{ id: 'ice_regular', name: L('Regular', 'ធម្មតា'), priceDelta: 0, active: true, isDefault: true, sortOrder: 2 },
			{ id: 'ice_less', name: L('Less', 'តិច'), priceDelta: 0, active: true, sortOrder: 3 },
			{ id: 'ice_none', name: L('No ice', 'គ្មានទឹកកក'), priceDelta: 0, active: true, sortOrder: 4 }
		]
	},
	{
		id: 'mod_extras',
		name: L('Extras', 'បន្ថែម'),
		selectionMode: 'MULTIPLE',
		required: false,
		minSelections: 0,
		maxSelections: 4,
		active: true,
		sortOrder: 6,
		options: [
			{ id: 'extra_shot', name: L('Extra shot', 'ថ្នាំបន្ថែម'), priceDelta: 50, active: true, sortOrder: 1 },
			{ id: 'extra_caramel', name: L('Caramel syrup', 'ស៊ីរ៉ូការ៉ាមែល'), priceDelta: 50, active: true, sortOrder: 2 },
			{ id: 'extra_vanilla', name: L('Vanilla syrup', 'ស៊ីរ៉ូវ៉ានីឡា'), priceDelta: 50, active: true, sortOrder: 3 },
			{ id: 'extra_cream', name: L('Whipped cream', 'ក្រែម'), priceDelta: 50, active: true, sortOrder: 4 }
		]
	},
	{
		id: 'mod_spice',
		name: L('Spice', 'ហឹរ'),
		selectionMode: 'SINGLE',
		required: true,
		minSelections: 1,
		maxSelections: 1,
		active: true,
		sortOrder: 7,
		options: [
			{ id: 'spice_mild', name: L('Mild', 'ស្រាល'), priceDelta: 0, active: true, isDefault: true, sortOrder: 1 },
			{ id: 'spice_medium', name: L('Medium', 'មធ្យម'), priceDelta: 0, active: true, sortOrder: 2 },
			{ id: 'spice_hot', name: L('Hot', 'ហឹរ'), priceDelta: 0, active: true, sortOrder: 3 }
		]
	},
	{
		id: 'mod_doneness',
		name: L('Doneness', 'កម្រិតចំអិន'),
		selectionMode: 'SINGLE',
		required: true,
		minSelections: 1,
		maxSelections: 1,
		active: true,
		sortOrder: 8,
		options: [
			{ id: 'done_rare', name: L('Rare', 'ក្រហម'), priceDelta: 0, active: true, sortOrder: 1 },
			{ id: 'done_medium', name: L('Medium', 'មធ្យម'), priceDelta: 0, active: true, isDefault: true, sortOrder: 2 },
			{ id: 'done_well', name: L('Well done', 'ឆ្អិនល្អ'), priceDelta: 0, active: true, sortOrder: 3 }
		]
	},
	{
		id: 'mod_side',
		name: L('Side', 'ម្ហូបភ្ជាប់'),
		selectionMode: 'SINGLE',
		required: false,
		minSelections: 0,
		maxSelections: 1,
		active: true,
		sortOrder: 9,
		options: [
			{ id: 'side_fries', name: L('Fries', 'ដំឡូងបំពង'), priceDelta: 0, active: true, isDefault: true, sortOrder: 1 },
			{ id: 'side_salad', name: L('Salad', 'សាឡាដ'), priceDelta: 0, active: true, sortOrder: 2 },
			{ id: 'side_rice', name: L('Rice', 'បាយ'), priceDelta: 0, active: true, sortOrder: 3 }
		]
	},
	{
		id: 'mod_noodle',
		name: L('Noodle', 'ប្រភេទមី'),
		selectionMode: 'SINGLE',
		required: true,
		minSelections: 1,
		maxSelections: 1,
		active: true,
		sortOrder: 10,
		options: [
			{ id: 'noodle_egg', name: L('Egg noodle', 'មីពង'), priceDelta: 0, active: true, isDefault: true, sortOrder: 1 },
			{ id: 'noodle_rice', name: L('Rice noodle', 'គុយទាវ'), priceDelta: 0, active: true, sortOrder: 2 },
			{ id: 'noodle_udon', name: L('Udon', 'អ៊ូដុង'), priceDelta: 50, active: true, sortOrder: 3 }
		]
	},
	{
		id: 'mod_garnish',
		name: L('Garnish', 'តុបតែង'),
		selectionMode: 'MULTIPLE',
		required: false,
		minSelections: 0,
		maxSelections: 3,
		active: true,
		sortOrder: 11,
		options: [
			{ id: 'gar_lime', name: L('Lime', 'ក្រូចឆ្មា'), priceDelta: 0, active: true, sortOrder: 1 },
			{ id: 'gar_mint', name: L('Mint', 'ជី'), priceDelta: 0, active: true, sortOrder: 2 },
			{ id: 'gar_salt_rim', name: L('Salt rim', 'គែមអំបិល'), priceDelta: 25, active: true, sortOrder: 3 }
		]
	}
];

let productSort = 0;

function product(
	id: string,
	sku: string,
	erpItemId: string,
	en: string,
	kh: string,
	type: Product['type'],
	categoryId: string,
	image: string,
	basePrice: number,
	groups: string[],
	available = true,
	prepares = true,
	overrides: Product['branchOverrides'] = []
): Product {
	productSort += 1;
	return {
		id,
		sku,
		erpItemId,
		name: L(en, kh),
		description: L(en, kh),
		type,
		categoryId,
		imageUrl: image ? `/products/${image}` : '',
		basePrice,
		modifierGroupIds: groups,
		active: true,
		available,
		preparesInKitchen: prepares,
		taxCategoryId: 'tax_vat',
		sortOrder: productSort,
		branchOverrides: overrides
	};
}

/** Restaurant showcase — available at cafés + garden for the general POS demo. */
const restoFocus = [
	{ branchId: 'br_main', available: true },
	{ branchId: 'br_bkk', available: true },
	{ branchId: 'br_skybar', available: false },
	{ branchId: 'br_resto', available: true }
];
/** Skybar-only cocktails / bar bites. */
const skybarFocus = [
	{ branchId: 'br_main', available: false },
	{ branchId: 'br_bkk', available: false },
	{ branchId: 'br_skybar', available: true },
	{ branchId: 'br_resto', available: false }
];

export const products: Product[] = [
	/* —— Coffee Plus café —— */
	product('prd_americano', 'DRK-001', 'DRK-001', 'Americano', 'អាមេរិកាណូ', 'DRINK', 'cat_coffee', 'americano.jpg', 300, drinkGroups),
	product('prd_latte', 'DRK-002', 'DRK-002', 'Latte', 'ឡាតេ', 'DRINK', 'cat_coffee', 'latte.jpg', 350, drinkGroups),
	product('prd_cappuccino', 'DRK-003', 'DRK-003', 'Cappuccino', 'កាពូឈីណូ', 'DRINK', 'cat_coffee', 'cappuccino.jpg', 350, drinkGroups),
	product('prd_mocha', 'DRK-004', 'DRK-004', 'Mocha', 'ម៉ូកា', 'DRINK', 'cat_coffee', 'mocha.jpg', 400, drinkGroups),
	product('prd_macchiato', 'DRK-005', 'DRK-005', 'Caramel Macchiato', 'ការ៉ាមែលម៉ាកៀតូ', 'DRINK', 'cat_coffee', 'macchiato.jpg', 450, drinkGroups),
	product('prd_flat_white', 'DRK-009', 'DRK-009', 'Flat White', 'ហ្វ្លាតវ៉ៃត៍', 'DRINK', 'cat_coffee', 'flat-white.jpg', 380, drinkGroups),
	product('prd_espresso', 'DRK-010', 'DRK-010', 'Espresso', 'អេស្ព្រេសសូ', 'DRINK', 'cat_coffee', 'espresso.jpg', 250, ['mod_temp', 'mod_extras']),
	product('prd_affogato', 'DRK-013', 'DRK-013', 'Affogato', 'អាហ្វូហ្កាតូ', 'DRINK', 'cat_coffee', 'affogato.jpg', 420, ['mod_extras']),
	product('prd_cold_brew', 'DRK-014', 'DRK-014', 'Cold Brew', 'កាហ្វេត្រជាក់ទុកយូរ', 'DRINK', 'cat_cold', 'cold-brew.jpg', 340, icedGroups),
	product('prd_green_tea', 'TEA-001', 'TEA-001', 'Green Tea Latte', 'ឡាតេតែបៃតង', 'DRINK', 'cat_tea', 'green-tea.jpg', 400, drinkGroups),
	product('prd_thai_tea', 'TEA-002', 'TEA-002', 'Thai Tea', 'តែថៃ', 'DRINK', 'cat_tea', 'thai-tea.jpg', 350, icedGroups),
	product('prd_matcha', 'TEA-003', 'TEA-003', 'Matcha Latte', 'ឡាតេម៉ាឆា', 'DRINK', 'cat_tea', 'matcha.jpg', 400, drinkGroups),
	product('prd_brown_sugar', 'TEA-004', 'TEA-004', 'Brown Sugar Milk Tea', 'តែទឹកដោះគោស្ករត្នោត', 'DRINK', 'cat_tea', 'brown-sugar-milk.jpg', 380, icedGroups),
	product('prd_iced_coffee', 'DRK-006', 'DRK-006', 'Iced Coffee', 'កាហ្វេទឹកកក', 'DRINK', 'cat_cold', 'iced-coffee.jpg', 300, icedGroups),
	product('prd_chocolate', 'DRK-007', 'DRK-007', 'Iced Chocolate', 'សូកូឡាទឹកកក', 'DRINK', 'cat_noncoffee', 'chocolate.jpg', 350, icedGroups),
	product('prd_lime', 'DRK-008', 'DRK-008', 'Lime Iced Tea', 'តែក្រូចឆ្មាទឹកកក', 'DRINK', 'cat_noncoffee', 'lime-tea.jpg', 280, ['mod_size', 'mod_ice', 'mod_sugar']),
	product('prd_soda_yuzu', 'DRK-011', 'DRK-011', 'Yuzu Soda', 'សូដាយូហ្ស៊ូ', 'DRINK', 'cat_cold', 'yuzu-soda.jpg', 320, ['mod_size', 'mod_ice']),
	product('prd_croissant', 'BKY-001', 'BKY-001', 'Croissant', 'ក្រូសង់', 'BAKERY', 'cat_bakery', 'croissant.jpg', 250, []),
	product('prd_muffin', 'BKY-002', 'BKY-002', 'Blueberry Muffin', 'ម៉ាហ្វីនប៊្លូប៊ឺរី', 'BAKERY', 'cat_bakery', 'muffin.jpg', 300, []),
	product('prd_bagel', 'BKY-003', 'BKY-003', 'Sesame Bagel', 'បេហ្គលល្ង', 'BAKERY', 'cat_bakery', 'bagel.jpg', 280, []),
	product('prd_pain_chocolat', 'BKY-004', 'BKY-004', 'Pain au Chocolat', 'នំប៉័ងសូកូឡា', 'BAKERY', 'cat_bakery', 'pain-chocolat.jpg', 290, []),
	product('prd_banana_bread', 'BKY-005', 'BKY-005', 'Banana Bread', 'នំប៉័ងចេក', 'BAKERY', 'cat_bakery', 'banana-bread.jpg', 270, []),
	product('prd_cheesecake', 'PST-001', 'PST-001', 'Cheesecake', 'នំឈីស', 'BAKERY', 'cat_pastries', 'cheesecake.jpg', 400, []),
	product('prd_donut', 'PST-002', 'PST-002', 'Donut', 'ដូណាត់', 'BAKERY', 'cat_pastries', 'donut.jpg', 250, []),
	product('prd_cookie', 'PST-003', 'PST-003', 'Cookie', 'ខូឃី', 'BAKERY', 'cat_pastries', 'cookie.jpg', 200, [], false),
	product('prd_tiramisu', 'PST-004', 'PST-004', 'Tiramisu Cup', 'ទីរ៉ាមីស៊ូ', 'BAKERY', 'cat_pastries', 'tiramisu.jpg', 450, []),
	/* —— General POS food (demo staples) —— */
	product('prd_toast', 'FOD-001', 'FOD-001', 'Avocado Toast', 'នំប៉័ងអាវ៉ូកាដូ', 'FOOD', 'cat_food', 'toast.jpg', 450, []),
	product('prd_sandwich', 'FOD-002', 'FOD-002', 'Chicken Sandwich', 'សាំងវិចមាន់', 'FOOD', 'cat_food', 'sandwich.jpg', 500, []),
	product('prd_club', 'FOD-008', 'FOD-008', 'Club Sandwich', 'សាំងវិចក្លាប', 'FOOD', 'cat_food', 'club-sandwich.jpg', 550, []),
	product('prd_burger', 'FOD-009', 'FOD-009', 'Chicken Burger', 'ប៊ឺហ្គឺមាន់', 'FOOD', 'cat_food', 'chicken-burger.jpg', 620, ['mod_side']),
	product('prd_wrap', 'FOD-010', 'FOD-010', 'Chicken Wrap', 'រ៉ាបមាន់', 'FOOD', 'cat_food', 'chicken-wrap.jpg', 520, []),
	product('prd_caesar', 'FOD-011', 'FOD-011', 'Caesar Salad', 'សាឡាដស៊ីសា', 'FOOD', 'cat_food', 'caesar-salad.jpg', 480, []),
	product('prd_pasta', 'FOD-012', 'FOD-012', 'Creamy Pasta', 'ប៉ាស្តាក្រែម', 'FOOD', 'cat_food', 'pasta-cream.jpg', 680, []),
	product('prd_soup', 'FOD-013', 'FOD-013', 'Tomato Soup', 'ស៊ុបប៉េងប៉ោះ', 'FOOD', 'cat_food', 'tomato-soup.jpg', 380, []),
	product('prd_chicken_rice', 'FOD-014', 'FOD-014', 'Grilled Chicken Rice', 'បាយមាន់អាំង', 'FOOD', 'cat_food', 'grilled-chicken-rice.jpg', 650, foodSpiceGroups),
	product('prd_beef_bowl', 'FOD-015', 'FOD-015', 'Beef Rice Bowl', 'បាយសាច់គោ', 'FOOD', 'cat_food', 'beef-bowl.jpg', 700, foodSpiceGroups),
	product('prd_fish_chips', 'FOD-016', 'FOD-016', 'Fish & Chips', 'ត្រី និងដំឡូង', 'FOOD', 'cat_food', 'fish-chips.jpg', 750, ['mod_side']),
	product('prd_salmon', 'FOD-017', 'FOD-017', 'Salmon Plate', 'ត្រីសាល់ម៉ន', 'FOOD', 'cat_food', 'salmon-plate.jpg', 980, ['mod_side']),
	product('prd_quiche', 'FOD-018', 'FOD-018', 'Quiche Lorraine', 'ឃ្វីស', 'FOOD', 'cat_food', 'quiche.jpg', 520, [], true, false),
	product('prd_fries', 'FOD-019', 'FOD-019', 'French Fries', 'ដំឡូងបំពង', 'FOOD', 'cat_food', 'fries-side.jpg', 280, [], true, false),
	product('prd_granola', 'FOD-003', 'FOD-003', 'Yogurt Granola', 'យ៉ាអួហ្គឺត', 'FOOD', 'cat_food', 'granola.jpg', 420, [], true, false),
	product('prd_eggs_benny', 'FOD-004', 'FOD-004', 'Eggs Benedict', 'ពងមាន់បេណេឌិក', 'FOOD', 'cat_food', 'eggs-benedict.jpg', 650, []),
	product('prd_acai', 'FOD-005', 'FOD-005', 'Acai Bowl', 'ចានអាកៃ', 'FOOD', 'cat_food', 'acai-bowl.jpg', 550, [], true, false),
	product('prd_pancakes', 'FOD-006', 'FOD-006', 'Stack Pancakes', 'ផែនខេក', 'FOOD', 'cat_food', 'pancakes.jpg', 480, []),
	product('prd_honey_toast', 'FOD-007', 'FOD-007', 'Honey Butter Toast', 'នំប៉័ងទឹកឃ្មុំ', 'FOOD', 'cat_food', 'honey-toast.jpg', 460, []),

	/* —— Garden restaurant (also on café for demo) —— */
	product('prd_spring_rolls', 'RST-011', 'RST-011', 'Fresh Spring Rolls', 'ណែមស្រស់', 'FOOD', 'cat_starters', 'spring-rolls.jpg', 480, [], true, true, restoFocus),
	product('prd_papaya', 'RST-012', 'RST-012', 'Green Papaya Salad', 'បុកស្វាយ', 'FOOD', 'cat_starters', 'papaya-salad.jpg', 520, foodSpiceGroups, true, true, restoFocus),
	product('prd_tom_yum', 'RST-013', 'RST-013', 'Tom Yum Soup', 'ស៊ុបតុំយុំ', 'FOOD', 'cat_starters', 'tom-yum.jpg', 620, foodSpiceGroups, true, true, restoFocus),
	product('prd_prawn_cake', 'RST-014', 'RST-014', 'Prawn Cakes', 'នំប៉ាវបង្គា', 'FOOD', 'cat_starters', 'prawn-cake.jpg', 580, foodSpiceGroups, true, true, restoFocus),
	product('prd_amok', 'RST-001', 'RST-001', 'Fish Amok', 'អាម៉ុកត្រី', 'FOOD', 'cat_mains', 'fish-amok.jpg', 850, foodSpiceGroups, true, true, restoFocus),
	product('prd_lok_lak', 'RST-002', 'RST-002', 'Beef Lok Lak', 'ឡុកឡាក់', 'FOOD', 'cat_mains', 'lok-lak.jpg', 900, foodSpiceGroups, true, true, restoFocus),
	product('prd_green_curry', 'RST-003', 'RST-003', 'Green Curry Chicken', 'ខេរីបៃតង', 'FOOD', 'cat_mains', 'green-curry.jpg', 780, foodSpiceGroups, true, true, restoFocus),
	product('prd_pad_krapow', 'RST-004', 'RST-004', 'Basil Stir-fry', 'ឆាកូរភ្លៅ', 'FOOD', 'cat_mains', 'basil-stirfry.jpg', 720, foodSpiceGroups, true, true, restoFocus),
	product('prd_fried_rice', 'RST-015', 'RST-015', 'Seafood Fried Rice', 'បាយឆាសមុទ្រ', 'FOOD', 'cat_mains', 'fried-rice.jpg', 700, foodSpiceGroups, true, true, restoFocus),
	product('prd_ribeye', 'RST-005', 'RST-005', 'Ribeye Steak', 'សាច់គោរីបអាយ', 'FOOD', 'cat_grill', 'ribeye.jpg', 1800, grillGroups, true, true, restoFocus),
	product('prd_grilled_sea', 'RST-006', 'RST-006', 'Grilled Seabass', 'ត្រីអាំង', 'FOOD', 'cat_grill', 'grilled-seabass.jpg', 1400, ['mod_side'], true, true, restoFocus),
	product('prd_satay', 'RST-007', 'RST-007', 'Chicken Satay', 'សាតេមាន់', 'FOOD', 'cat_grill', 'satay.jpg', 650, foodSpiceGroups, true, true, restoFocus),
	product('prd_pho', 'RST-008', 'RST-008', 'Beef Pho', 'គុយទាវសាច់គោ', 'FOOD', 'cat_noodles', 'pho.jpg', 700, noodleGroups, true, true, restoFocus),
	product('prd_kuy_teav', 'RST-009', 'RST-009', 'Phnom Penh Noodle', 'គុយទាវភ្នំពេញ', 'FOOD', 'cat_noodles', 'kuy-teav.jpg', 650, noodleGroups, true, true, restoFocus),
	product('prd_pad_thai', 'RST-010', 'RST-010', 'Pad Thai', 'ផាត់ថៃ', 'FOOD', 'cat_noodles', 'pad-thai.jpg', 680, noodleGroups, true, true, restoFocus),
	product('prd_mango_sticky', 'RST-016', 'RST-016', 'Mango Sticky Rice', 'បាយដំណើបស្វាយ', 'FOOD', 'cat_desserts', 'mango-sticky.jpg', 450, [], true, true, restoFocus),

	/* —— Riverside skybar —— */
	product('prd_mojito', 'BAR-001', 'BAR-001', 'Classic Mojito', 'ម៉ូហ៊ីតូ', 'DRINK', 'cat_skybar', 'mojito.jpg', 650, cocktailGroups, true, true, skybarFocus),
	product('prd_margarita', 'BAR-002', 'BAR-002', 'Margarita', 'ម៉ាហ្គារីតា', 'DRINK', 'cat_skybar', 'margarita.jpg', 700, cocktailGroups, true, true, skybarFocus),
	product('prd_espresso_martini', 'BAR-003', 'BAR-003', 'Espresso Martini', 'អេស្ព្រេសសូម៉ាទីនី', 'DRINK', 'cat_skybar', 'espresso-martini.jpg', 750, ['mod_garnish'], true, true, skybarFocus),
	product('prd_negroni', 'BAR-004', 'BAR-004', 'Negroni', 'នេហ្គ្រូនី', 'DRINK', 'cat_skybar', 'negroni.jpg', 720, cocktailGroups, true, true, skybarFocus),
	product('prd_sunset_spritz', 'BAR-005', 'BAR-005', 'Mekong Spritz', 'មេគង្គស្ព្រីត', 'DRINK', 'cat_skybar', 'mekong-spritz.jpg', 680, cocktailGroups, true, true, skybarFocus),
	product('prd_mocktail', 'BAR-006', 'BAR-006', 'Passion Mocktail', 'ម៉ក់ធល់ផាសិន', 'DRINK', 'cat_skybar', 'passion-mocktail.jpg', 450, cocktailGroups, true, true, skybarFocus),
	product('prd_old_fashioned', 'BAR-011', 'BAR-011', 'Old Fashioned', 'អូលដ៍ហ្វេសសិន', 'DRINK', 'cat_skybar', 'old-fashioned.jpg', 780, cocktailGroups, true, true, skybarFocus),
	product('prd_gin_tonic', 'BAR-012', 'BAR-012', 'Gin & Tonic', 'ជីន និងតូនិក', 'DRINK', 'cat_skybar', 'gin-tonic.jpg', 620, cocktailGroups, true, true, skybarFocus),
	product('prd_wings', 'BAR-007', 'BAR-007', 'Buffalo Wings', 'ស្លាបមាន់', 'FOOD', 'cat_bar_snacks', 'wings.jpg', 550, foodSpiceGroups, true, true, skybarFocus),
	product('prd_nachos', 'BAR-008', 'BAR-008', 'Loaded Nachos', 'ណាឈូស', 'FOOD', 'cat_bar_snacks', 'nachos.jpg', 600, foodSpiceGroups, true, true, skybarFocus),
	product('prd_sliders', 'BAR-009', 'BAR-009', 'Beef Sliders', 'ស្លាយដឺសាច់គោ', 'FOOD', 'cat_bar_snacks', 'sliders.jpg', 750, ['mod_side'], true, true, skybarFocus),
	product('prd_edamame', 'BAR-010', 'BAR-010', 'Salted Edamame', 'សណ្តែកអេដាម៉ាមេ', 'FOOD', 'cat_bar_snacks', 'edamame.jpg', 350, [], true, true, skybarFocus),
	product('prd_calamari', 'BAR-013', 'BAR-013', 'Crispy Calamari', 'កាឡាម៉ារីឆ្ងាញ់', 'FOOD', 'cat_bar_snacks', 'calamari.jpg', 680, foodSpiceGroups, true, true, skybarFocus),
	product('prd_truffle_fries', 'BAR-014', 'BAR-014', 'Truffle Fries', 'ដំឡូងបំពងត្រុហ្វល', 'FOOD', 'cat_bar_snacks', 'truffle-fries.jpg', 520, [], true, true, skybarFocus),
	product('prd_cheese_board', 'BAR-015', 'BAR-015', 'Cheese Board', 'ឈុតឈីស', 'FOOD', 'cat_bar_snacks', 'cheese-board.jpg', 900, [], true, true, skybarFocus),

	/* Shared across venues (coffee also at skybar for late guests) */
	product(
		'prd_late_latte',
		'DRK-012',
		'DRK-012',
		'Night Latte',
		'ឡាតេយប់',
		'DRINK',
		'cat_coffee',
		'night-latte.jpg',
		380,
		drinkGroups,
		true,
		true,
		[
			{ branchId: 'br_main', available: true },
			{ branchId: 'br_skybar', available: true, basePrice: 420 },
			{ branchId: 'br_resto', available: true }
		]
	)
];

const byId = new Map(products.map((item) => [item.id, item]));

function line(productId: string, qty: number, optionIds: string[] = []): CartLine {
	const item = byId.get(productId);
	if (!item) throw new Error(productId);
	return makeLine(item, qty, selectionFrom(modifierGroups, optionIds));
}

export function emptyCart(orderType: OrderType = 'TAKEAWAY'): Cart {
	return {
		lines: [],
		orderType,
		discountMode: 'NONE',
		discountValue: 0,
		note: '',
		delivery: { recipientName: '', phone: '', address: '', note: '', channel: 'OWN', appRef: '' }
	};
}

function at(now: number, minutesAgo: number): string {
	return new Date(now - minutesAgo * 60_000).toISOString();
}

interface SeedOrderInput {
	number: string;
	minutesAgo: number;
	cashierId: string;
	customerId?: string;
	orderType: OrderType;
	tableId?: string;
	branchId?: string;
	branchName?: { en: string; kh: string };
	lines: CartLine[];
	discountMode?: DiscountMode;
	discountValue?: number;
	method?: PaymentMethod;
	paymentStatus?: PaymentStatus;
	orderStatus: OrderStatus;
	kitchen?: KitchenStatus;
	sync: SyncState;
	source?: Order['source'];
	refundReason?: string;
}

function buildOrder(now: number, input: SeedOrderInput, settings: DemoAppState['settings'], branchWarehouse: string): Order {
	const branchId = input.branchId ?? 'br_main';
	const branchName = input.branchName ?? L('Main Branch', 'សាខាធំ');
	const stamp = at(now, input.minutesAgo);
	const totals = priceCart(
		input.lines.reduce((sum, row) => sum + row.lineTotal, 0),
		input.discountMode ?? 'NONE',
		input.discountValue ?? 0,
		settings.tax,
		settings.usdToKhr
	);
	const paid = input.paymentStatus === 'PAID' || input.paymentStatus === 'REFUNDED';
	const timeline: TimelineEvent[] = [];
	if (paid && input.method) timeline.push({ at: stamp, code: 'paid' });
	if (input.kitchen) {
		timeline.push({
			at: stamp,
			code:
				input.kitchen === 'NEW'
					? 'kitchen_new'
					: input.kitchen === 'PREPARING'
						? 'kitchen_preparing'
						: input.kitchen === 'READY'
							? 'kitchen_ready'
							: 'kitchen_completed'
		});
	}
	if (input.orderStatus === 'COMPLETED') timeline.push({ at: stamp, code: 'completed' });
	if (input.paymentStatus === 'REFUNDED') timeline.push({ at: stamp, code: 'refunded', detail: input.refundReason });
	const erp = input.sync === 'SYNCED' ? `SI-${input.number}` : undefined;
	const paymentStatus = input.paymentStatus ?? 'PAID';
	const payment = input.method
		? {
				id: `pay_${input.number}`,
				method: input.method,
				status: paymentStatus === 'PARTIAL_REFUND' ? ('PAID' as const) : paymentStatus,
				amount: totals.total,
				amountReceived: input.method === 'CASH' ? totals.total : totals.total,
				changeDue: 0,
				createdAt: stamp,
				demoReference: `TXN-${input.method}-${input.number}`
			}
		: undefined;
	const lines = input.lines.map((line) =>
		line.preparesInKitchen && input.kitchen ? { ...line, kitchenStatus: input.kitchen } : { ...line }
	);
	const waitingDigits = input.number.replace(/\D/g, '').slice(-2);
	return {
		id: `ord_${input.number}`,
		orderNumber: input.number,
		waitingNumber: waitingDigits.padStart(2, '0'),
		posTransactionId: `pos_${input.number}`,
		branchId,
		warehouseId: branchWarehouse,
		terminalId: settings.terminalId,
		cashierId: input.cashierId,
		shiftId: paid ? 'sh_yesterday' : undefined,
		customerId: input.customerId,
		orderType: input.orderType,
		tableId: input.tableId,
		lines,
		totals,
		discountMode: input.discountMode ?? 'NONE',
		discountValue: input.discountValue ?? 0,
		orderStatus: input.orderStatus,
		paymentStatus,
		kitchenStatus: input.kitchen,
		syncStatus: input.sync,
		erpTransactionId: erp,
		payment,
		payments: payment ? [payment] : [],
		createdAt: stamp,
		paidAt: paid ? stamp : undefined,
		completedAt: input.orderStatus === 'COMPLETED' ? stamp : undefined,
		refundReason: input.refundReason,
		refundedTotal: paymentStatus === 'REFUNDED' ? totals.total : 0,
		refunds:
			paymentStatus === 'REFUNDED' && input.method
				? [
						{
							id: `rf_${input.number}`,
							amount: totals.total,
							method: input.method,
							kind: 'FULL' as const,
							reason: input.refundReason ?? 'Refund',
							staffId: input.cashierId,
							createdAt: stamp
						}
					]
				: [],
		receipt: {
			shopName: settings.shopName,
			tagline: settings.tagline,
			address: settings.address,
			phone: settings.phone,
			taxId: settings.taxId,
			footer: settings.receiptFooter,
			branchName,
			cashierName: input.cashierId === 'stf_sarah' ? L('Sarah Lee', 'សារ៉ា លី') : L('John Smith', 'ចន ស្មីត'),
			paper: settings.receiptTemplate?.paper ?? settings.paper,
			docType: settings.receiptTemplate?.docType ?? 'CAFE',
			language: settings.receiptTemplate?.language ?? 'both',
			logoUrl: settings.receiptTemplate?.logoUrl || undefined,
			qrUrl: settings.receiptTemplate?.qrUrl || undefined,
			vatRegistered: settings.receiptTemplate?.vatRegistered,
			vattin: settings.receiptTemplate?.vattin || settings.taxId,
			show: settings.receiptTemplate?.show
		},
		timeline,
		source: input.source ?? 'DEMO_SEED'
	};
}

/**
 * @param sampleSales — when true (first install), include sample paid orders for kitchen/reports.
 *   Reset demo uses false so sales, kitchen, and sync queue start empty.
 */
export function createSeedState(now = Date.now(), options?: { sampleSales?: boolean }): DemoAppState {
	const sampleSales = options?.sampleSales !== false;
	const settings: DemoAppState['settings'] = {
		shopName: L('Coffee Plus', 'កាហ្វេ ផ្លឹស'),
		tagline: L('Good Coffee, Good Mood', 'កាហ្វេឆ្ងាញ់ អារម្មណ៍ល្អ'),
		address: L('No. 12, Street 240, Phnom Penh', 'ផ្ទះលេខ ១២ ផ្លូវ ២៤០ ភ្នំពេញ'),
		phone: '012 345 678',
		taxId: 'K001-234567890',
		receiptFooter: L('Thank You!', 'សូមអរគុណ!'),
		receiptTemplate: {
			docType: 'CAFE',
			language: 'both',
			paper: '80',
			logoUrl: '',
			qrUrl: '',
			vatRegistered: false,
			vattin: 'K001-234567890',
			show: {
				logo: true,
				businessInfo: true,
				cashier: true,
				branch: false,
				table: true,
				orderType: true,
				customer: false,
				sku: false,
				modifiers: true,
				discount: true,
				tax: true,
				serviceCharge: false,
				payment: true,
				received: true,
				change: true,
				qr: false,
				footer: true
			}
		},
		currency: 'USD',
		usdToKhr: 4100,
		tax: {
			id: 'tax_vat',
			name: L('VAT', 'អាករ'),
			rateBasisPoints: 1000,
			calculationMode: 'EXCLUSIVE',
			active: true
		},
		defaultOrderType: 'TAKEAWAY',
		paper: '80',
		/** High enough for a normal café ticket while Offline is on (demo). */
		offlineCashLimitCents: 50000,
		paymentMethods: [
			{ method: 'CASH', enabled: true, label: L('Cash', 'សាច់ប្រាក់') },
			{ method: 'CARD', enabled: true, label: L('Card', 'កាត') },
			{ method: 'QR', enabled: true, label: L('QR Payment', 'ទូទាត់ QR') },
			{ method: 'GRABPAY', enabled: true, label: L('GrabPay', 'GrabPay') }
		],
		kitchenSoundEnabled: true,
		persistOpenOrdersEnabled: true,
		managerPinEnabled: true,
		managerPin: '1234',
		businessId: 'biz_coffee_plus',
		terminalId: 'term_main_1',
		demoMode: true
	};

	const taxCategories = [
		{ ...settings.tax },
		{
			id: 'tax_exempt',
			name: L('No tax', 'គ្មានអាករ'),
			rateBasisPoints: 0,
			calculationMode: 'EXCLUSIVE' as const,
			active: true
		}
	];

	const orders: Order[] = [
		buildOrder(now, {
			number: 'CP-1008',
			minutesAgo: 4,
			cashierId: 'stf_john',
			orderType: 'TAKEAWAY',
			lines: [line('prd_latte', 1, ['size_l', 'temp_iced', 'milk_oat', 'sugar_50', 'ice_regular', 'extra_shot'])],
			method: 'QR',
			orderStatus: 'CONFIRMED',
			kitchen: 'NEW',
			sync: 'PENDING'
		}, settings, 'wh_main'),
		buildOrder(now, {
			number: 'CP-1007',
			minutesAgo: 14,
			cashierId: 'stf_john',
			customerId: 'cus_sokha',
			orderType: 'TAKEAWAY',
			lines: [line('prd_iced_coffee', 1, ['size_m', 'ice_regular', 'milk_regular', 'sugar_70'])],
			method: 'CASH',
			orderStatus: 'CONFIRMED',
			kitchen: 'PREPARING',
			sync: 'SYNCED'
		}, settings, 'wh_main'),
		buildOrder(now, {
			number: 'CP-1006',
			minutesAgo: 9,
			cashierId: 'stf_sarah',
			customerId: 'cus_emily',
			orderType: 'DINE_IN',
			tableId: 'tbl_4',
			lines: [line('prd_mocha', 1, ['size_m', 'temp_hot', 'milk_regular', 'sugar_50'])],
			method: 'CARD',
			orderStatus: 'CONFIRMED',
			kitchen: 'READY',
			sync: 'SYNCED'
		}, settings, 'wh_main'),
		buildOrder(now, {
			number: 'CP-1012',
			minutesAgo: 3,
			cashierId: 'stf_john',
			orderType: 'DINE_IN',
			tableId: 'tbl_6',
			lines: [
				line('prd_amok', 1, ['spice_medium', 'side_rice']),
				line('prd_pho', 1, ['spice_mild', 'noodle_rice'])
			],
			method: 'CARD',
			orderStatus: 'CONFIRMED',
			kitchen: 'NEW',
			sync: 'PENDING'
		}, settings, 'wh_main'),
		buildOrder(now, {
			number: 'CP-1011',
			minutesAgo: 11,
			cashierId: 'stf_sarah',
			orderType: 'DINE_IN',
			tableId: 'tbl_7',
			lines: [
				line('prd_ribeye', 1, ['done_medium', 'side_fries']),
				line('prd_green_curry', 1, ['spice_hot', 'side_rice'])
			],
			method: 'QR',
			orderStatus: 'CONFIRMED',
			kitchen: 'PREPARING',
			sync: 'SYNCED'
		}, settings, 'wh_main'),
		buildOrder(now, {
			number: 'CP-1010',
			minutesAgo: 6,
			cashierId: 'stf_john',
			customerId: 'cus_daniel',
			orderType: 'DINE_IN',
			tableId: 'tbl_8',
			lines: [line('prd_eggs_benny', 1), line('prd_flat_white', 1, ['size_m', 'temp_hot', 'milk_oat', 'sugar_50'])],
			method: 'CASH',
			orderStatus: 'CONFIRMED',
			kitchen: 'PREPARING',
			sync: 'SYNCED'
		}, settings, 'wh_main'),
		buildOrder(now, {
			number: 'SB-2201',
			minutesAgo: 5,
			cashierId: 'stf_alex',
			orderType: 'DINE_IN',
			tableId: 'tbl_sky_2',
			branchId: 'br_skybar',
			branchName: L('Riverside Skybar', 'ស្កាយបារមេគង្គ'),
			lines: [
				line('prd_mojito', 2, ['ice_regular', 'gar_mint', 'gar_lime']),
				line('prd_wings', 1, ['spice_hot', 'side_fries'])
			],
			method: 'CARD',
			orderStatus: 'CONFIRMED',
			kitchen: 'NEW',
			sync: 'PENDING'
		}, settings, 'wh_sky'),
		buildOrder(now, {
			number: 'SB-2200',
			minutesAgo: 18,
			cashierId: 'stf_alex',
			orderType: 'DINE_IN',
			tableId: 'tbl_sky_1',
			branchId: 'br_skybar',
			branchName: L('Riverside Skybar', 'ស្កាយបារមេគង្គ'),
			lines: [
				line('prd_espresso_martini', 1, ['gar_mint']),
				line('prd_nachos', 1, ['spice_medium', 'side_salad']),
				line('prd_sliders', 1, ['side_fries'])
			],
			method: 'QR',
			orderStatus: 'CONFIRMED',
			kitchen: 'PREPARING',
			sync: 'SYNCED'
		}, settings, 'wh_sky'),
		buildOrder(now, {
			number: 'GR-3304',
			minutesAgo: 8,
			cashierId: 'stf_john',
			orderType: 'DINE_IN',
			tableId: 'tbl_gr_3',
			branchId: 'br_resto',
			branchName: L('Garden Restaurant', 'ភោជនីយដ្ឋានសួន'),
			lines: [
				line('prd_lok_lak', 1, ['spice_medium', 'side_rice']),
				line('prd_grilled_sea', 1, ['side_salad']),
				line('prd_pad_thai', 1, ['spice_mild', 'noodle_rice'])
			],
			method: 'CARD',
			orderStatus: 'CONFIRMED',
			kitchen: 'NEW',
			sync: 'PENDING'
		}, settings, 'wh_resto'),
		buildOrder(now, {
			number: 'CP-1005',
			minutesAgo: 80,
			cashierId: 'stf_john',
			customerId: 'cus_daniel',
			orderType: 'DINE_IN',
			tableId: 'tbl_2',
			lines: [line('prd_cappuccino', 1, ['size_s', 'temp_hot', 'milk_regular', 'sugar_100']), line('prd_cheesecake', 1)],
			discountMode: 'PERCENT',
			discountValue: 10,
			method: 'CARD',
			orderStatus: 'COMPLETED',
			kitchen: 'COMPLETED',
			sync: 'SYNCED'
		}, settings, 'wh_main'),
		buildOrder(now, {
			number: 'CP-1004',
			minutesAgo: 150,
			cashierId: 'stf_john',
			orderType: 'TAKEAWAY',
			lines: [line('prd_americano', 1, ['size_m', 'temp_hot', 'milk_regular', 'sugar_0']), line('prd_croissant', 1)],
			method: 'CASH',
			orderStatus: 'COMPLETED',
			kitchen: 'COMPLETED',
			sync: 'SYNCED'
		}, settings, 'wh_main'),
		buildOrder(now, {
			number: 'CP-1003',
			minutesAgo: 200,
			cashierId: 'stf_john',
			customerId: 'cus_sokha',
			orderType: 'TAKEAWAY',
			lines: [line('prd_thai_tea', 2, ['size_l', 'ice_regular', 'milk_regular', 'sugar_100'])],
			method: 'GRABPAY',
			orderStatus: 'COMPLETED',
			kitchen: 'COMPLETED',
			sync: 'SYNCED'
		}, settings, 'wh_main'),
		buildOrder(now, {
			number: 'CP-1002',
			minutesAgo: 260,
			cashierId: 'stf_sarah',
			orderType: 'DINE_IN',
			tableId: 'tbl_1',
			lines: [line('prd_sandwich', 1), line('prd_lime', 1, ['size_m', 'ice_regular', 'sugar_50'])],
			method: 'CASH',
			orderStatus: 'COMPLETED',
			kitchen: 'COMPLETED',
			sync: 'SYNCED'
		}, settings, 'wh_main'),
		buildOrder(now, {
			number: 'CP-1001',
			minutesAgo: 60 * 26,
			cashierId: 'stf_john',
			customerId: 'cus_emily',
			orderType: 'TAKEAWAY',
			lines: [line('prd_latte', 1, ['size_m', 'temp_hot', 'milk_regular', 'sugar_100']), line('prd_muffin', 1)],
			method: 'CASH',
			orderStatus: 'COMPLETED',
			kitchen: 'COMPLETED',
			sync: 'SYNCED'
		}, settings, 'wh_main'),
		buildOrder(now, {
			number: 'CP-0999',
			minutesAgo: 60 * 28,
			cashierId: 'stf_john',
			orderType: 'TAKEAWAY',
			lines: [line('prd_mocha', 1, ['size_s', 'temp_hot', 'milk_regular', 'sugar_100'])],
			method: 'CASH',
			paymentStatus: 'REFUNDED',
			orderStatus: 'COMPLETED',
			kitchen: 'COMPLETED',
			sync: 'SYNCED',
			refundReason: 'Wrong drink'
		}, settings, 'wh_main'),
		buildOrder(now, {
			number: 'CP-0990',
			minutesAgo: 60 * 24 * 5,
			cashierId: 'stf_sarah',
			customerId: 'cus_daniel',
			orderType: 'TAKEAWAY',
			lines: [line('prd_cheesecake', 1), line('prd_americano', 1, ['size_s', 'temp_hot', 'milk_regular', 'sugar_0'])],
			method: 'CARD',
			orderStatus: 'COMPLETED',
			kitchen: 'COMPLETED',
			sync: 'SYNCED'
		}, settings, 'wh_main')
	];

	const outbox: OutboxRecord[] = orders
		.filter((order) => order.paymentStatus === 'PAID' || order.paymentStatus === 'REFUNDED')
		.map((order) => ({
			id: `ob_${order.orderNumber}`,
			eventType: 'SALE_FINALIZED' as const,
			posTransactionId: order.posTransactionId,
			orderId: order.id,
			orderNumber: order.orderNumber,
			state: order.syncStatus,
			attemptCount: order.syncStatus === 'SYNCED' ? 1 : 0,
			createdAt: order.paidAt ?? order.createdAt,
			erpTransactionId: order.erpTransactionId
		}));

	const closed: CashShift = {
		id: 'sh_yesterday',
		staffId: 'stf_alex',
		branchId: 'br_main',
		openingCash: 20000,
		openedAt: at(now, 60 * 30),
		closedAt: at(now, 60 * 20),
		countedCash: 24800,
		expectedCash: 25000,
		cashSales: 5000,
		nonCashSales: 3200,
		status: 'CLOSED',
		note: 'Yesterday close',
		movements: []
	};

	/** Open float for the default cashier so pay works without a pre-demo Shifts step. */
	const openJohn: CashShift = {
		id: 'sh_open_john',
		staffId: 'stf_john',
		branchId: 'br_main',
		openingCash: 20000,
		openedAt: at(now, 90),
		status: 'OPEN',
		note: 'Morning float',
		movements: []
	};

	/** Open float for manager — settings / kitchen demos that switch staff can still pay. */
	const openAlex: CashShift = {
		id: 'sh_open_alex',
		staffId: 'stf_alex',
		branchId: 'br_main',
		openingCash: 20000,
		openedAt: at(now, 90),
		status: 'OPEN',
		movements: []
	};

	const customers: Customer[] = [
		{ id: 'cus_emily', name: L('Emily Carter', 'អេមីលី ខាធើ'), phone: '012 555 011', email: 'emily.carter@example.com', active: true, createdAt: at(now, 60 * 24 * 40) },
		{ id: 'cus_daniel', name: L('Daniel Kim', 'ដានីយ៉ែល គីម'), phone: '012 555 014', email: 'daniel.kim@example.com', active: true, createdAt: at(now, 60 * 24 * 20) },
		{ id: 'cus_sokha', name: L('Meas Sokha', 'មាស សុខា'), phone: '012 555 019', notes: 'Prefers less sugar', active: true, createdAt: at(now, 60 * 24 * 12) }
	];

	return {
		settings,
		taxCategories,
		activeBranchId: 'br_main',
		activeStaffId: 'stf_john',
		demoLink: 'online',
		branches: [
			{
				id: 'br_main',
				name: L('Main Café', 'កាហ្វេសាខាធំ'),
				address: settings.address,
				phone: settings.phone,
				warehouseId: 'wh_main',
				active: true
			},
			{
				id: 'br_bkk',
				name: L('BKK Café', 'កាហ្វេបឹងកេងកង'),
				address: L('Street 308, Boeung Keng Kang, Phnom Penh', 'ផ្លូវ ៣០៨ បឹងកេងកង ភ្នំពេញ'),
				phone: '012 345 679',
				warehouseId: 'wh_bkk',
				active: true
			},
			{
				id: 'br_skybar',
				name: L('Riverside Skybar', 'ស្កាយបារមេគង្គ'),
				address: L('Tonle Sap Boardwalk, Phnom Penh', 'មាត់ទន្លេសាប ភ្នំពេញ'),
				phone: '012 345 680',
				warehouseId: 'wh_sky',
				active: true
			},
			{
				id: 'br_resto',
				name: L('Garden Restaurant', 'ភោជនីយដ្ឋានសួន'),
				address: L('Street 240 Garden Court, Phnom Penh', 'ផ្លូវ ២៤០ សួន ភ្នំពេញ'),
				phone: '012 345 681',
				warehouseId: 'wh_resto',
				active: true
			}
		],
		categories,
		modifierGroups,
		products,
		customers,
		staff: [
			{
				id: 'stf_john',
				name: L('John Smith', 'ចន ស្មីត'),
				roleId: 'role_cashier',
				branchIds: ['br_main'],
				phone: '012 555 101',
				loginPin: '1234',
				active: true
			},
			{
				id: 'stf_sarah',
				name: L('Sarah Lee', 'សារ៉ា លី'),
				roleId: 'role_barista',
				branchIds: ['br_main', 'br_bkk'],
				phone: '012 555 102',
				loginPin: '1234',
				active: true
			},
			{
				id: 'stf_alex',
				name: L('Alex Morgan', 'អាឡិច ម៉ូហ្គែន'),
				roleId: 'role_manager',
				branchIds: ['br_main', 'br_bkk', 'br_skybar', 'br_resto'],
				phone: '012 555 103',
				loginPin: '1234',
				active: true
			}
		],
		roles: [
			{
				id: 'role_cashier',
				name: L('Cashier', 'អ្នកគិតលុយ'),
				/** Kitchen included so the default cashier can complete the sell → KDS loop in one staff. */
				permissions: ['pos', 'orders', 'reports', 'shifts', 'customers', 'kitchen']
			},
			{ id: 'role_barista', name: L('Barista', 'អ្នកផ្សំកាហ្វេ'), permissions: ['kitchen', 'orders'] },
			{
				id: 'role_manager',
				name: L('Manager', 'អ្នកគ្រប់គ្រង'),
				permissions: ['pos', 'orders', 'kitchen', 'refund', 'products', 'reports', 'shifts', 'settings', 'customers', 'staff']
			}
		],
		tables: [
			...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
				id: `tbl_${n}`,
				branchId: 'br_main',
				name: `T${n}`,
				capacity: n % 2 === 0 ? 4 : 2,
				status: n === 3 ? ('RESERVED' as const) : ('AVAILABLE' as const),
				active: true
			})),
			...[1, 2, 3, 4].map((n) => ({
				id: `tbl_bkk_${n}`,
				branchId: 'br_bkk',
				name: `B${n}`,
				capacity: 2,
				status: 'AVAILABLE' as const,
				active: true
			})),
			...[1, 2, 3, 4, 5, 6].map((n) => ({
				id: `tbl_sky_${n}`,
				branchId: 'br_skybar',
				name: `S${n}`,
				capacity: n > 4 ? 6 : 2,
				status: 'AVAILABLE' as const,
				active: true
			})),
			...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
				id: `tbl_gr_${n}`,
				branchId: 'br_resto',
				name: `G${n}`,
				capacity: n % 3 === 0 ? 6 : 4,
				status: 'AVAILABLE' as const,
				active: true
			}))
		],
		orders: sampleSales ? orders : [],
		cart: emptyCart(),
		shifts: sampleSales ? [closed, openJohn, openAlex] : [openJohn, openAlex],
		outbox: sampleSales ? outbox : []
	};
}
