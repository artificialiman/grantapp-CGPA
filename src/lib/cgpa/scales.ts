/**
 * Grading scale data, sourced and cross-checked against multiple
 * independent sources (openeducat.org, monoed.africa, gradecalchub.com,
 * campustutor.ng — all agree on the NUC 5.0-scale figures below) rather
 * than invented from training-data recall, since a wrong grade-point
 * mapping would misinform a student's actual degree classification.
 *
 * cgpa-CGPA's own INVARIANTS.md #3 marks "which grading scale(s) apply
 * per faculty" as [OPEN] — undecided whether all faculties share one
 * scale. This module doesn't resolve that; it gives the student an
 * explicit scale CHOICE (5.0 is the default/most common, 4.0 is the
 * real alternative used by Nigerian polytechnics/some private
 * universities) rather than silently assuming one on their behalf.
 */

export type ScaleId = 'nuc-5.0' | 'poly-4.0';

export type GradeBand = {
	grade: string;
	points: number;
	minPercent: number; // inclusive lower bound of the percentage range this letter grade covers
};

export type ClassificationBand = {
	label: string;
	min: number; // inclusive CGPA lower bound
	max: number; // inclusive CGPA upper bound
};

export type GradingScale = {
	id: ScaleId;
	name: string;
	maxPoint: number;
	grades: GradeBand[];
	classifications: ClassificationBand[];
	sourceNote: string;
};

export const GRADING_SCALES: Record<ScaleId, GradingScale> = {
	'nuc-5.0': {
		id: 'nuc-5.0',
		name: 'NUC 5.0 scale (most Nigerian universities)',
		maxPoint: 5,
		grades: [
			{ grade: 'A', points: 5, minPercent: 70 },
			{ grade: 'B', points: 4, minPercent: 60 },
			{ grade: 'C', points: 3, minPercent: 50 },
			{ grade: 'D', points: 2, minPercent: 45 },
			{ grade: 'E', points: 1, minPercent: 40 },
			{ grade: 'F', points: 0, minPercent: 0 }
		],
		classifications: [
			{ label: 'First Class', min: 4.5, max: 5.0 },
			{ label: 'Second Class Upper (2:1)', min: 3.5, max: 4.49 },
			{ label: 'Second Class Lower (2:2)', min: 2.4, max: 3.49 },
			{ label: 'Third Class', min: 1.5, max: 2.39 },
			{ label: 'Pass', min: 1.0, max: 1.49 },
			{ label: 'Fail (no degree awarded)', min: 0, max: 0.99 }
		],
		sourceNote:
			'NUC Benchmark Minimum Academic Standards. A=70%+ is the most common threshold, though some private universities (e.g. Babcock, Adeleke) set the A threshold at 75-80% instead — verify against your own institution\u2019s handbook if precision matters for a specific decision.'
	},
	'poly-4.0': {
		id: 'poly-4.0',
		name: '4.0 scale (Nigerian polytechnics, some private universities)',
		maxPoint: 4,
		grades: [
			{ grade: 'A', points: 4, minPercent: 70 },
			{ grade: 'B', points: 3, minPercent: 60 },
			{ grade: 'C', points: 2, minPercent: 50 },
			{ grade: 'D', points: 1, minPercent: 45 },
			{ grade: 'F', points: 0, minPercent: 0 }
		],
		// Polytechnic classification bands (Distinction/Upper Credit/etc.)
		// are genuinely more institution-variable than the NUC university
		// scale's bands per the sources checked — deliberately left out
		// rather than presenting an invented/unverified set of thresholds
		// as if they were standardized. The calculator below still works
		// (raw CGPA + grade points), just without a classification label
		// for this scale until real polytechnic-specific bands are
		// sourced and confirmed.
		classifications: [],
		sourceNote:
			'NBTE-prescribed scale for Nigerian polytechnics. Classification bands (Distinction/Upper Credit/etc.) vary more by institution than the university 5.0 scale\u2019s bands do, so they are intentionally not shown here — only the raw CGPA is computed for this scale.'
	}
};

export function classifyGpa(scale: GradingScale, gpa: number): string | null {
	const band = scale.classifications.find((b) => gpa >= b.min && gpa <= b.max);
	return band?.label ?? null;
}
