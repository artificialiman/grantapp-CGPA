/**
 * The entire faculty -> department -> course catalog, hardcoded and
 * bundled with the app. This is real seed data, transcribed exactly
 * from supabase/migrations 0005/0007/0008/0011/0013 -- not invented.
 *
 * Why hardcoded: this is an offline-heavy app, and the catalog is
 * static curriculum structure that barely changes -- it doesn't need a
 * network round-trip to browse. Per direct instruction: only questions,
 * analytics, status, and notifications should ever be live-fetched.
 * Browsing faculties/departments/courses now costs zero Supabase calls.
 *
 * `slug` on each course matches cgpa.courses.slug exactly (migration
 * 0016) -- unique per department, not globally (several departments
 * legitimately share a course name, e.g. every Engineering discipline's
 * "Engineering Mathematics I"). Course id is a DB-generated identity
 * column with no fixed value derivable from the seed migrations, so
 * `slug` -- not `id` -- is what this static catalog and the live DB
 * agree on. The one place that still needs a live Supabase call
 * (resolving a course's real numeric id, right before fetching its
 * questions) does exactly one lookup by (departmentSlug, courseSlug) --
 * see $lib/catalog-resolve.ts.
 *
 * Regenerate via /home/claude/catalog-gen/ if the seed data ever
 * changes -- do not hand-edit slugs, they must stay byte-identical to
 * what migration 0016's regexp_replace produces in Postgres.
 *
 * HAND-ADDED (2026-09-28, not from the generator): departments
 * microbiology, cybersecurity (science), medical-laboratory-science
 * (medicine) and faculties economics, insurance -- all with EMPTY course
 * lists on purpose (no curriculum has been supplied for them, and course
 * content goes through the approval discipline, not agent invention).
 * They are mirrored in migration ..._cgpa_0018_catalog_priority_programmes
 * so cgpa.departments has the rows courses.department_id will need. The
 * generator script is NOT in this repo: if it is ever re-run it will drop
 * these unless it also reads that migration.
 */

export type CatalogCourse = {
	slug: string;
	name: string;
	code: string | null;
	year: number;
	kind: 'core' | 'elective';
};

export type CatalogDepartment = {
	slug: string;
	name: string;
	courses: CatalogCourse[];
};

export type CatalogFaculty = {
	slug: string;
	name: string;
	departments: CatalogDepartment[];
};

export const CATALOG: CatalogFaculty[] = [
	{
		slug: 'science',
		name: 'Science',
		departments: [
			{
				slug: 'computer-science',
				name: 'Computer Science',
				courses: [
					{ slug: 'csc101', name: 'Introduction to Computer Science', code: 'CSC101', year: 1, kind: 'core' },
					{ slug: 'mth101', name: 'Calculus I', code: 'MTH101', year: 1, kind: 'core' },
					{ slug: 'gst101', name: 'Use of English', code: 'GST101', year: 1, kind: 'core' },
					{ slug: 'soc101', name: 'Introduction to Sociology', code: 'SOC101', year: 1, kind: 'elective' },
					{ slug: 'csc201', name: 'Data Structures and Algorithms', code: 'CSC201', year: 2, kind: 'core' },
					{ slug: 'mth201', name: 'Discrete Mathematics', code: 'MTH201', year: 2, kind: 'core' },
					{ slug: 'csc202', name: 'Digital Logic Design', code: 'CSC202', year: 2, kind: 'elective' },
				]
			},
			{
				slug: 'biochemistry',
				name: 'Biochemistry',
				courses: [
				]
			},
			{
				slug: 'microbiology',
				name: 'Microbiology',
				courses: [
				]
			},
			{
				slug: 'cybersecurity',
				name: 'Cybersecurity',
				courses: [
				]
			},
			{
				slug: 'environmental-management-and-toxicology',
				name: 'Environmental Management and Toxicology',
				courses: [
					{ slug: 'principles-of-ecology', name: 'Principles of Ecology', code: null, year: 1, kind: 'core' },
					{ slug: 'introduction-to-environmental-science', name: 'Introduction to Environmental Science', code: null, year: 1, kind: 'core' },
					{ slug: 'general-chemistry-for-environmental-science', name: 'General Chemistry for Environmental Science', code: null, year: 1, kind: 'core' },
					{ slug: 'environmental-chemistry', name: 'Environmental Chemistry', code: null, year: 2, kind: 'core' },
					{ slug: 'environmental-microbiology', name: 'Environmental Microbiology', code: null, year: 2, kind: 'core' },
					{ slug: 'principles-of-toxicology', name: 'Principles of Toxicology', code: null, year: 2, kind: 'core' },
					{ slug: 'environmental-pollution-and-control', name: 'Environmental Pollution and Control', code: null, year: 3, kind: 'core' },
					{ slug: 'ecotoxicology', name: 'Ecotoxicology', code: null, year: 3, kind: 'core' },
					{ slug: 'environmental-impact-assessment', name: 'Environmental Impact Assessment', code: null, year: 3, kind: 'core' },
					{ slug: 'industrial-toxicology', name: 'Industrial Toxicology', code: null, year: 4, kind: 'core' },
					{ slug: 'environmental-law-and-policy', name: 'Environmental Law and Policy', code: null, year: 4, kind: 'core' },
					{ slug: 'waste-management', name: 'Waste Management', code: null, year: 4, kind: 'core' },
					{ slug: 'environmental-risk-assessment', name: 'Environmental Risk Assessment', code: null, year: 5, kind: 'core' },
					{ slug: 'occupational-health-and-toxicology', name: 'Occupational Health and Toxicology', code: null, year: 5, kind: 'core' },
					{ slug: 'final-year-project', name: 'Final Year Project', code: null, year: 5, kind: 'core' },
				]
			},
		]
	},
	{
		slug: 'engineering',
		name: 'Engineering',
		departments: [
			{
				slug: 'civil-engineering',
				name: 'Civil Engineering',
				courses: [
					{ slug: 'engineering-mathematics-i', name: 'Engineering Mathematics I', code: null, year: 1, kind: 'core' },
					{ slug: 'engineering-drawing', name: 'Engineering Drawing', code: null, year: 1, kind: 'core' },
					{ slug: 'introduction-to-engineering', name: 'Introduction to Engineering', code: null, year: 1, kind: 'core' },
					{ slug: 'engineering-mathematics-ii', name: 'Engineering Mathematics II', code: null, year: 2, kind: 'core' },
					{ slug: 'mechanics-of-solids', name: 'Mechanics of Solids', code: null, year: 2, kind: 'core' },
					{ slug: 'thermodynamics', name: 'Thermodynamics', code: null, year: 2, kind: 'core' },
					{ slug: 'structural-analysis', name: 'Structural Analysis', code: null, year: 3, kind: 'core' },
					{ slug: 'soil-mechanics', name: 'Soil Mechanics', code: null, year: 3, kind: 'core' },
					{ slug: 'hydraulics', name: 'Hydraulics', code: null, year: 3, kind: 'core' },
					{ slug: 'reinforced-concrete-design', name: 'Reinforced Concrete Design', code: null, year: 4, kind: 'core' },
					{ slug: 'highway-engineering', name: 'Highway Engineering', code: null, year: 4, kind: 'core' },
					{ slug: 'water-resources-engineering', name: 'Water Resources Engineering', code: null, year: 4, kind: 'core' },
					{ slug: 'steel-structure-design', name: 'Steel Structure Design', code: null, year: 5, kind: 'core' },
					{ slug: 'construction-management', name: 'Construction Management', code: null, year: 5, kind: 'core' },
					{ slug: 'final-year-project', name: 'Final Year Project', code: null, year: 5, kind: 'core' },
				]
			},
			{
				slug: 'mechanical-engineering',
				name: 'Mechanical Engineering',
				courses: [
					{ slug: 'engineering-mathematics-i', name: 'Engineering Mathematics I', code: null, year: 1, kind: 'core' },
					{ slug: 'engineering-drawing', name: 'Engineering Drawing', code: null, year: 1, kind: 'core' },
					{ slug: 'introduction-to-engineering', name: 'Introduction to Engineering', code: null, year: 1, kind: 'core' },
					{ slug: 'engineering-mathematics-ii', name: 'Engineering Mathematics II', code: null, year: 2, kind: 'core' },
					{ slug: 'mechanics-of-solids', name: 'Mechanics of Solids', code: null, year: 2, kind: 'core' },
					{ slug: 'thermodynamics', name: 'Thermodynamics', code: null, year: 2, kind: 'core' },
					{ slug: 'fluid-mechanics', name: 'Fluid Mechanics', code: null, year: 3, kind: 'core' },
					{ slug: 'machine-design-i', name: 'Machine Design I', code: null, year: 3, kind: 'core' },
					{ slug: 'manufacturing-processes', name: 'Manufacturing Processes', code: null, year: 3, kind: 'core' },
					{ slug: 'heat-transfer', name: 'Heat Transfer', code: null, year: 4, kind: 'core' },
					{ slug: 'machine-design-ii', name: 'Machine Design II', code: null, year: 4, kind: 'core' },
					{ slug: 'control-systems', name: 'Control Systems', code: null, year: 4, kind: 'core' },
					{ slug: 'automobile-engineering', name: 'Automobile Engineering', code: null, year: 5, kind: 'core' },
					{ slug: 'industrial-engineering', name: 'Industrial Engineering', code: null, year: 5, kind: 'core' },
					{ slug: 'final-year-project', name: 'Final Year Project', code: null, year: 5, kind: 'core' },
				]
			},
			{
				slug: 'electrical-and-electronic-engineering',
				name: 'Electrical and Electronic Engineering',
				courses: [
					{ slug: 'engineering-mathematics-i', name: 'Engineering Mathematics I', code: null, year: 1, kind: 'core' },
					{ slug: 'engineering-drawing', name: 'Engineering Drawing', code: null, year: 1, kind: 'core' },
					{ slug: 'introduction-to-engineering', name: 'Introduction to Engineering', code: null, year: 1, kind: 'core' },
					{ slug: 'engineering-mathematics-ii', name: 'Engineering Mathematics II', code: null, year: 2, kind: 'core' },
					{ slug: 'mechanics-of-solids', name: 'Mechanics of Solids', code: null, year: 2, kind: 'core' },
					{ slug: 'thermodynamics', name: 'Thermodynamics', code: null, year: 2, kind: 'core' },
					{ slug: 'circuit-theory', name: 'Circuit Theory', code: null, year: 3, kind: 'core' },
					{ slug: 'electronics-i', name: 'Electronics I', code: null, year: 3, kind: 'core' },
					{ slug: 'electrical-machines-i', name: 'Electrical Machines I', code: null, year: 3, kind: 'core' },
					{ slug: 'power-systems-i', name: 'Power Systems I', code: null, year: 4, kind: 'core' },
					{ slug: 'electronics-ii', name: 'Electronics II', code: null, year: 4, kind: 'core' },
					{ slug: 'control-engineering', name: 'Control Engineering', code: null, year: 4, kind: 'core' },
					{ slug: 'power-systems-ii', name: 'Power Systems II', code: null, year: 5, kind: 'core' },
					{ slug: 'telecommunications-engineering', name: 'Telecommunications Engineering', code: null, year: 5, kind: 'core' },
					{ slug: 'final-year-project', name: 'Final Year Project', code: null, year: 5, kind: 'core' },
				]
			},
			{
				slug: 'chemical-engineering',
				name: 'Chemical Engineering',
				courses: [
					{ slug: 'engineering-mathematics-i', name: 'Engineering Mathematics I', code: null, year: 1, kind: 'core' },
					{ slug: 'engineering-drawing', name: 'Engineering Drawing', code: null, year: 1, kind: 'core' },
					{ slug: 'introduction-to-engineering', name: 'Introduction to Engineering', code: null, year: 1, kind: 'core' },
					{ slug: 'engineering-mathematics-ii', name: 'Engineering Mathematics II', code: null, year: 2, kind: 'core' },
					{ slug: 'mechanics-of-solids', name: 'Mechanics of Solids', code: null, year: 2, kind: 'core' },
					{ slug: 'thermodynamics', name: 'Thermodynamics', code: null, year: 2, kind: 'core' },
					{ slug: 'mass-transfer-operations', name: 'Mass Transfer Operations', code: null, year: 3, kind: 'core' },
					{ slug: 'chemical-reaction-engineering', name: 'Chemical Reaction Engineering', code: null, year: 3, kind: 'core' },
					{ slug: 'process-fluid-mechanics', name: 'Process Fluid Mechanics', code: null, year: 3, kind: 'core' },
					{ slug: 'process-control', name: 'Process Control', code: null, year: 4, kind: 'core' },
					{ slug: 'plant-design', name: 'Plant Design', code: null, year: 4, kind: 'core' },
					{ slug: 'heat-transfer-operations', name: 'Heat Transfer Operations', code: null, year: 4, kind: 'core' },
					{ slug: 'process-economics', name: 'Process Economics', code: null, year: 5, kind: 'core' },
					{ slug: 'petrochemical-engineering', name: 'Petrochemical Engineering', code: null, year: 5, kind: 'core' },
					{ slug: 'final-year-project', name: 'Final Year Project', code: null, year: 5, kind: 'core' },
				]
			},
			{
				slug: 'petroleum-engineering',
				name: 'Petroleum Engineering',
				courses: [
					{ slug: 'engineering-mathematics-i', name: 'Engineering Mathematics I', code: null, year: 1, kind: 'core' },
					{ slug: 'engineering-drawing', name: 'Engineering Drawing', code: null, year: 1, kind: 'core' },
					{ slug: 'introduction-to-engineering', name: 'Introduction to Engineering', code: null, year: 1, kind: 'core' },
					{ slug: 'engineering-mathematics-ii', name: 'Engineering Mathematics II', code: null, year: 2, kind: 'core' },
					{ slug: 'mechanics-of-solids', name: 'Mechanics of Solids', code: null, year: 2, kind: 'core' },
					{ slug: 'thermodynamics', name: 'Thermodynamics', code: null, year: 2, kind: 'core' },
					{ slug: 'reservoir-engineering-i', name: 'Reservoir Engineering I', code: null, year: 3, kind: 'core' },
					{ slug: 'drilling-engineering', name: 'Drilling Engineering', code: null, year: 3, kind: 'core' },
					{ slug: 'petroleum-geology', name: 'Petroleum Geology', code: null, year: 3, kind: 'core' },
					{ slug: 'reservoir-engineering-ii', name: 'Reservoir Engineering II', code: null, year: 4, kind: 'core' },
					{ slug: 'production-engineering', name: 'Production Engineering', code: null, year: 4, kind: 'core' },
					{ slug: 'well-logging', name: 'Well Logging', code: null, year: 4, kind: 'core' },
					{ slug: 'natural-gas-engineering', name: 'Natural Gas Engineering', code: null, year: 5, kind: 'core' },
					{ slug: 'petroleum-economics', name: 'Petroleum Economics', code: null, year: 5, kind: 'core' },
					{ slug: 'final-year-project', name: 'Final Year Project', code: null, year: 5, kind: 'core' },
				]
			},
			{
				slug: 'agricultural-and-bioresources-engineering',
				name: 'Agricultural and Bioresources Engineering',
				courses: [
					{ slug: 'engineering-mathematics-i', name: 'Engineering Mathematics I', code: null, year: 1, kind: 'core' },
					{ slug: 'engineering-drawing', name: 'Engineering Drawing', code: null, year: 1, kind: 'core' },
					{ slug: 'introduction-to-engineering', name: 'Introduction to Engineering', code: null, year: 1, kind: 'core' },
					{ slug: 'engineering-mathematics-ii', name: 'Engineering Mathematics II', code: null, year: 2, kind: 'core' },
					{ slug: 'mechanics-of-solids', name: 'Mechanics of Solids', code: null, year: 2, kind: 'core' },
					{ slug: 'thermodynamics', name: 'Thermodynamics', code: null, year: 2, kind: 'core' },
					{ slug: 'soil-and-water-engineering', name: 'Soil and Water Engineering', code: null, year: 3, kind: 'core' },
					{ slug: 'farm-power-and-machinery', name: 'Farm Power and Machinery', code: null, year: 3, kind: 'core' },
					{ slug: 'post-harvest-engineering', name: 'Post-Harvest Engineering', code: null, year: 3, kind: 'core' },
					{ slug: 'irrigation-and-drainage-engineering', name: 'Irrigation and Drainage Engineering', code: null, year: 4, kind: 'core' },
					{ slug: 'food-process-engineering', name: 'Food Process Engineering', code: null, year: 4, kind: 'core' },
					{ slug: 'bioresources-engineering', name: 'Bioresources Engineering', code: null, year: 4, kind: 'core' },
					{ slug: 'farm-structures', name: 'Farm Structures', code: null, year: 5, kind: 'core' },
					{ slug: 'renewable-energy-in-agriculture', name: 'Renewable Energy in Agriculture', code: null, year: 5, kind: 'core' },
					{ slug: 'final-year-project', name: 'Final Year Project', code: null, year: 5, kind: 'core' },
				]
			},
			{
				slug: 'metallurgical-and-materials-engineering',
				name: 'Metallurgical and Materials Engineering',
				courses: [
					{ slug: 'engineering-mathematics-i', name: 'Engineering Mathematics I', code: null, year: 1, kind: 'core' },
					{ slug: 'engineering-drawing', name: 'Engineering Drawing', code: null, year: 1, kind: 'core' },
					{ slug: 'introduction-to-engineering', name: 'Introduction to Engineering', code: null, year: 1, kind: 'core' },
					{ slug: 'engineering-mathematics-ii', name: 'Engineering Mathematics II', code: null, year: 2, kind: 'core' },
					{ slug: 'mechanics-of-solids', name: 'Mechanics of Solids', code: null, year: 2, kind: 'core' },
					{ slug: 'thermodynamics', name: 'Thermodynamics', code: null, year: 2, kind: 'core' },
					{ slug: 'physical-metallurgy', name: 'Physical Metallurgy', code: null, year: 3, kind: 'core' },
					{ slug: 'mineral-processing', name: 'Mineral Processing', code: null, year: 3, kind: 'core' },
					{ slug: 'materials-science', name: 'Materials Science', code: null, year: 3, kind: 'core' },
					{ slug: 'extractive-metallurgy', name: 'Extractive Metallurgy', code: null, year: 4, kind: 'core' },
					{ slug: 'corrosion-engineering', name: 'Corrosion Engineering', code: null, year: 4, kind: 'core' },
					{ slug: 'ceramic-materials', name: 'Ceramic Materials', code: null, year: 4, kind: 'core' },
					{ slug: 'polymer-engineering', name: 'Polymer Engineering', code: null, year: 5, kind: 'core' },
					{ slug: 'metal-casting-and-welding', name: 'Metal Casting and Welding', code: null, year: 5, kind: 'core' },
					{ slug: 'final-year-project', name: 'Final Year Project', code: null, year: 5, kind: 'core' },
				]
			},
		]
	},
	{
		slug: 'law',
		name: 'Law',
		departments: [
			{
				slug: 'common-law',
				name: 'Common Law',
				courses: [
					{ slug: 'nigerian-legal-system', name: 'Nigerian Legal System', code: null, year: 1, kind: 'core' },
					{ slug: 'constitutional-law-i', name: 'Constitutional Law I', code: null, year: 1, kind: 'core' },
					{ slug: 'law-of-contract-i', name: 'Law of Contract I', code: null, year: 1, kind: 'core' },
					{ slug: 'law-of-contract-ii', name: 'Law of Contract II', code: null, year: 2, kind: 'core' },
					{ slug: 'law-of-torts', name: 'Law of Torts', code: null, year: 2, kind: 'core' },
					{ slug: 'family-law', name: 'Family Law', code: null, year: 2, kind: 'core' },
					{ slug: 'criminal-law', name: 'Criminal Law', code: null, year: 3, kind: 'core' },
					{ slug: 'land-law', name: 'Land Law', code: null, year: 3, kind: 'core' },
					{ slug: 'law-of-evidence', name: 'Law of Evidence', code: null, year: 3, kind: 'core' },
					{ slug: 'company-law', name: 'Company Law', code: null, year: 4, kind: 'core' },
					{ slug: 'commercial-law', name: 'Commercial Law', code: null, year: 4, kind: 'core' },
					{ slug: 'law-of-equity-and-trusts', name: 'Law of Equity and Trusts', code: null, year: 4, kind: 'core' },
					{ slug: 'legal-drafting-and-conveyancing', name: 'Legal Drafting and Conveyancing', code: null, year: 5, kind: 'core' },
					{ slug: 'international-law', name: 'International Law', code: null, year: 5, kind: 'core' },
					{ slug: 'human-rights-law', name: 'Human Rights Law', code: null, year: 5, kind: 'core' },
				]
			},
		]
	},
	{
		slug: 'medicine',
		name: 'Medicine',
		departments: [
			{
				slug: 'human-medicine',
				name: 'Human Medicine',
				courses: [
					{ slug: 'anatomy-i', name: 'Anatomy I', code: null, year: 1, kind: 'core' },
					{ slug: 'physiology-i', name: 'Physiology I', code: null, year: 1, kind: 'core' },
					{ slug: 'biochemistry-i', name: 'Biochemistry I', code: null, year: 1, kind: 'core' },
					{ slug: 'behavioural-sciences-in-medicine', name: 'Behavioural Sciences in Medicine', code: null, year: 1, kind: 'core' },
					{ slug: 'anatomy-ii-histology-and-embryology', name: 'Anatomy II (Histology and Embryology)', code: null, year: 2, kind: 'core' },
					{ slug: 'physiology-ii', name: 'Physiology II', code: null, year: 2, kind: 'core' },
					{ slug: 'biochemistry-ii', name: 'Biochemistry II', code: null, year: 2, kind: 'core' },
					{ slug: 'introduction-to-pharmacology', name: 'Introduction to Pharmacology', code: null, year: 2, kind: 'core' },
					{ slug: 'general-pathology', name: 'General Pathology', code: null, year: 3, kind: 'core' },
					{ slug: 'medical-microbiology', name: 'Medical Microbiology', code: null, year: 3, kind: 'core' },
					{ slug: 'pharmacology', name: 'Pharmacology', code: null, year: 3, kind: 'core' },
					{ slug: 'community-health-i', name: 'Community Health I', code: null, year: 3, kind: 'core' },
					{ slug: 'introduction-to-clinical-methods', name: 'Introduction to Clinical Methods', code: null, year: 4, kind: 'core' },
					{ slug: 'surgery-i', name: 'Surgery I', code: null, year: 4, kind: 'core' },
					{ slug: 'paediatrics-i', name: 'Paediatrics I', code: null, year: 4, kind: 'core' },
					{ slug: 'obstetrics-and-gynaecology-i', name: 'Obstetrics and Gynaecology I', code: null, year: 4, kind: 'core' },
					{ slug: 'internal-medicine-ii', name: 'Internal Medicine II', code: null, year: 5, kind: 'core' },
					{ slug: 'surgery-ii', name: 'Surgery II', code: null, year: 5, kind: 'core' },
					{ slug: 'psychiatry', name: 'Psychiatry', code: null, year: 5, kind: 'core' },
					{ slug: 'community-health-ii', name: 'Community Health II', code: null, year: 5, kind: 'core' },
					{ slug: 'internal-medicine-iii-finals', name: 'Internal Medicine III (Finals)', code: null, year: 6, kind: 'core' },
					{ slug: 'surgery-iii-finals', name: 'Surgery III (Finals)', code: null, year: 6, kind: 'core' },
					{ slug: 'obstetrics-and-gynaecology-ii', name: 'Obstetrics and Gynaecology II', code: null, year: 6, kind: 'core' },
					{ slug: 'paediatrics-ii', name: 'Paediatrics II', code: null, year: 6, kind: 'core' },
				]
			},
			{
				slug: 'medical-laboratory-science',
				name: 'Medical Laboratory Science',
				courses: [
				]
			},
		]
	},
	{
		slug: 'pharmacy',
		name: 'Pharmacy',
		departments: [
			{
				slug: 'pharmacy',
				name: 'Pharmacy',
				courses: [
					{ slug: 'general-chemistry', name: 'General Chemistry', code: null, year: 1, kind: 'core' },
					{ slug: 'general-physics', name: 'General Physics', code: null, year: 1, kind: 'core' },
					{ slug: 'general-biology', name: 'General Biology', code: null, year: 1, kind: 'core' },
					{ slug: 'organic-chemistry', name: 'Organic Chemistry', code: null, year: 2, kind: 'core' },
					{ slug: 'human-anatomy-and-physiology', name: 'Human Anatomy and Physiology', code: null, year: 2, kind: 'core' },
					{ slug: 'pharmaceutical-microbiology', name: 'Pharmaceutical Microbiology', code: null, year: 2, kind: 'core' },
					{ slug: 'pharmaceutics-i', name: 'Pharmaceutics I', code: null, year: 3, kind: 'core' },
					{ slug: 'pharmacology-i', name: 'Pharmacology I', code: null, year: 3, kind: 'core' },
					{ slug: 'pharmacognosy-i', name: 'Pharmacognosy I', code: null, year: 3, kind: 'core' },
					{ slug: 'pharmaceutics-ii', name: 'Pharmaceutics II', code: null, year: 4, kind: 'core' },
					{ slug: 'pharmacology-ii', name: 'Pharmacology II', code: null, year: 4, kind: 'core' },
					{ slug: 'clinical-pharmacy-i', name: 'Clinical Pharmacy I', code: null, year: 4, kind: 'core' },
					{ slug: 'industrial-pharmacy', name: 'Industrial Pharmacy', code: null, year: 5, kind: 'core' },
					{ slug: 'clinical-pharmacy-ii', name: 'Clinical Pharmacy II', code: null, year: 5, kind: 'core' },
					{ slug: 'pharmacy-practice-and-law', name: 'Pharmacy Practice and Law', code: null, year: 5, kind: 'core' },
				]
			},
		]
	},
	{
		slug: 'nursing',
		name: 'Nursing',
		departments: [
			{
				slug: 'nursing-science',
				name: 'Nursing Science',
				courses: [
					{ slug: 'anatomy-for-nursing', name: 'Anatomy for Nursing', code: null, year: 1, kind: 'core' },
					{ slug: 'physiology-for-nursing', name: 'Physiology for Nursing', code: null, year: 1, kind: 'core' },
					{ slug: 'nursing-foundations-i', name: 'Nursing Foundations I', code: null, year: 1, kind: 'core' },
					{ slug: 'pharmacology-for-nurses', name: 'Pharmacology for Nurses', code: null, year: 2, kind: 'core' },
					{ slug: 'medical-surgical-nursing-i', name: 'Medical-Surgical Nursing I', code: null, year: 2, kind: 'core' },
					{ slug: 'nutrition-and-dietetics', name: 'Nutrition and Dietetics', code: null, year: 2, kind: 'core' },
					{ slug: 'medical-surgical-nursing-ii', name: 'Medical-Surgical Nursing II', code: null, year: 3, kind: 'core' },
					{ slug: 'maternal-and-child-health-nursing', name: 'Maternal and Child Health Nursing', code: null, year: 3, kind: 'core' },
					{ slug: 'community-health-nursing-i', name: 'Community Health Nursing I', code: null, year: 3, kind: 'core' },
					{ slug: 'mental-health-and-psychiatric-nursing', name: 'Mental Health and Psychiatric Nursing', code: null, year: 4, kind: 'core' },
					{ slug: 'paediatric-nursing', name: 'Paediatric Nursing', code: null, year: 4, kind: 'core' },
					{ slug: 'nursing-research', name: 'Nursing Research', code: null, year: 4, kind: 'core' },
					{ slug: 'nursing-management-and-leadership', name: 'Nursing Management and Leadership', code: null, year: 5, kind: 'core' },
					{ slug: 'midwifery', name: 'Midwifery', code: null, year: 5, kind: 'core' },
					{ slug: 'critical-care-nursing', name: 'Critical Care Nursing', code: null, year: 5, kind: 'core' },
				]
			},
		]
	},
	{
		slug: 'general-studies',
		name: 'General Studies',
		departments: [
			{
				slug: 'general-studies',
				name: 'General Studies',
				courses: [
					{ slug: 'gst101', name: 'Use of English and Communication Skills I', code: 'GST101', year: 1, kind: 'core' },
					{ slug: 'gst102', name: 'Use of English and Communication Skills II', code: 'GST102', year: 1, kind: 'core' },
					{ slug: 'gst103', name: 'Nigerian Peoples and Culture', code: 'GST103', year: 1, kind: 'core' },
					{ slug: 'gst104', name: 'Logic, Philosophy and Human Existence', code: 'GST104', year: 1, kind: 'core' },
					{ slug: 'gst105', name: 'History and Philosophy of Science', code: 'GST105', year: 1, kind: 'core' },
					{ slug: 'gst106', name: 'Basic ICT and Computer Appreciation', code: 'GST106', year: 1, kind: 'core' },
					{ slug: 'gst201', name: 'Venture Creation and Entrepreneurship I', code: 'GST201', year: 2, kind: 'core' },
					{ slug: 'gst301', name: 'Peace and Conflict Resolution', code: 'GST301', year: 3, kind: 'core' },
					{ slug: 'gst302', name: 'Entrepreneurship Studies II (Venture Creation)', code: 'GST302', year: 3, kind: 'core' },
				]
			},
		]
	},
	{
		slug: 'economics',
		name: 'Economics',
		departments: [
			{
				slug: 'economics',
				name: 'Economics',
				courses: [
				]
			},
		]
	},
	{
		slug: 'insurance',
		name: 'Insurance',
		departments: [
			{
				slug: 'insurance',
				name: 'Insurance',
				courses: [
				]
			},
		]
	},
];

export function getFaculty(facultySlug: string): CatalogFaculty | undefined {
	return CATALOG.find((f) => f.slug === facultySlug);
}

export function getDepartment(
	facultySlug: string,
	deptSlug: string
): { faculty: CatalogFaculty; department: CatalogDepartment } | undefined {
	const faculty = getFaculty(facultySlug);
	if (!faculty) return undefined;
	const department = faculty.departments.find((d) => d.slug === deptSlug);
	if (!department) return undefined;
	return { faculty, department };
}

export function getCourse(
	facultySlug: string,
	deptSlug: string,
	courseSlug: string
): { faculty: CatalogFaculty; department: CatalogDepartment; course: CatalogCourse } | undefined {
	const found = getDepartment(facultySlug, deptSlug);
	if (!found) return undefined;
	const course = found.department.courses.find((c) => c.slug === courseSlug);
	if (!course) return undefined;
	return { ...found, course };
}
