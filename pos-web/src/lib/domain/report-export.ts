/** Filter-faithful CSV export helpers for reporting screens. */

export function toCsv(headers: string[], rows: (string | number)[][]): string {
	const escape = (value: string | number) => {
		const text = String(value ?? '');
		if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
		return text;
	};
	return [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
}

export function downloadCsv(filename: string, csv: string) {
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}
