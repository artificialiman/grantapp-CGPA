// Which question pack serves a course. The catalog names a course by (faculty, department, course);
// packs are named faculty/course and list the departments that carry them. Pure, so it is tested.

export type PackRef = { key: string; faculty: string; course: string; departments: string[] };

/**
 * The pack for this course in this department, or null when none exists.
 * A pack serves a department that it names, or every department of its own faculty when it lists "*".
 * A pack from the course's own faculty wins over one shared from another faculty.
 */
export function findPack<T extends PackRef>(packs: T[], faculty: string, dept: string, course: string): T | null {
	const fits = packs.filter(
		(p) =>
			p.course === course &&
			(p.departments.indexOf(dept) !== -1 || (p.departments.indexOf('*') !== -1 && p.faculty === faculty))
	);
	return fits.find((p) => p.faculty === faculty) ?? fits[0] ?? null;
}
