import type { GradingScale } from './scales';

export type CourseEntry = {
	id: string; // client-side row id, not a cgpa.courses id — this calculator works standalone, not tied to a specific enrolled course
	name: string;
	creditUnits: number;
	grade: string; // must match one of the scale's grade letters
};

/**
 * CGPA = sum(grade_points x credit_units) / sum(credit_units) — the
 * standard credit-weighted formula confirmed across every source
 * checked for scales.ts. A course with more credit units counts more,
 * exactly as it does on a real transcript.
 */
export function calculateCgpa(entries: CourseEntry[], scale: GradingScale): number | null {
	const validEntries = entries.filter((e) => e.creditUnits > 0 && e.grade);
	if (validEntries.length === 0) return null;

	let totalQualityPoints = 0;
	let totalCreditUnits = 0;

	for (const entry of validEntries) {
		const gradeBand = scale.grades.find((g) => g.grade === entry.grade);
		if (!gradeBand) continue; // an entry with a grade letter not in this scale is silently skipped, not force-mapped to a guess
		totalQualityPoints += gradeBand.points * entry.creditUnits;
		totalCreditUnits += entry.creditUnits;
	}

	if (totalCreditUnits === 0) return null;
	return totalQualityPoints / totalCreditUnits;
}
