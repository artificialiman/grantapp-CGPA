import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { scoreAnswer } from '$lib/quiz/scoring';
import { updateMasteryForAnswer } from '$lib/quiz/mastery';
import { selectAdaptiveQuestions, selectStrengthQuestions } from '$lib/quiz/select';
import type { RequestHandler } from './$types';

const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;
const SET_SIZE = 20;

type SubmittedAnswer = {
	question_id: number;
	selected_option_id: string | null;
	time_taken_ms?: number;
	confidence_rating?: number;
};

/**
 * Ported from grantapp-shell's api/submit-daily-set -- doctrine
 * Clause 1. Gate logic fires here, on the submission that crosses a
 * threshold:
 *   - Set 1 submitted -> Gate 1: strength-targeted Sets 2+3, advance
 *     current_set to 2.
 *   - Set 3 submitted -> Gate 2: weakness-targeted Sets 4+5 (reuses
 *     selectAdaptiveQuestions -- its weighting already IS
 *     weakness-targeted), advance current_set to 4.
 *   - Any other set (2, 4, 5) -> just advance, no gate.
 *
 * Offline/scarcity degradation: if a gate can't fill a full 40 from
 * its targeted pool, top up from selectAdaptiveQuestions rather than
 * block the student, and record gate_N_degraded=true.
 *
 * Writes to student_question_progress via upsert (student_id,
 * keystone_question_id), same as Quick Test -- both contribute to the
 * same "progress toward 10,000 distinct questions" coverage metric
 * (see submit-quick-test's own comment), not two separate logs.
 * mastery_state is the piece that makes the gates possible at all --
 * without it, selectStrengthQuestions/selectAdaptiveQuestions have no
 * signal to weight against.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { session, user } = await locals.safeGetSession();
		if (!session || !user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const body = (await request.json()) as {
			mastery_assignment_id?: number;
			course_id?: number;
			set_number?: number;
			answers: SubmittedAnswer[];
		};

		const { mastery_assignment_id, course_id, set_number, answers } = body;

		if (!mastery_assignment_id || !course_id || !set_number || !Array.isArray(answers) || answers.length === 0) {
			return json(
				{ message: 'Missing mastery_assignment_id, course_id, set_number, or answers' },
				{ status: 400 }
			);
		}

		if (!SERVICE_ROLE_KEY) {
			console.error('SERVICE_ROLE_KEY not configured');
			return json({ message: 'Server configuration error' }, { status: 500 });
		}

		const { createClient } = await import('@supabase/supabase-js');
		const supabaseUrl = env.VITE_SUPABASE_URL;
		if (!supabaseUrl) {
			return json({ message: 'Server configuration error' }, { status: 500 });
		}

		const adminClient = createClient(supabaseUrl, SERVICE_ROLE_KEY, { db: { schema: 'cgpa' } });

		// Same belt-and-suspenders as mastery-set's GET -- see that
		// file's comment for the full reasoning. This endpoint's writes
		// (student_question_progress, mastery_state) both have a foreign
		// key on cgpa.students(id) too.
		const { error: ensureStudentError } = await adminClient
			.from('students')
			.upsert({ id: user.id, full_name: user.email?.split('@')[0] ?? 'Student' }, { onConflict: 'id', ignoreDuplicates: true });
		if (ensureStudentError) {
			console.error('submit-mastery-set ensure-student error:', ensureStudentError);
		}

		const { data: assignment, error: assignmentError } = await adminClient
			.from('mastery_assignments')
			.select('id, student_id, current_set, question_sets, gate_1_fired_at, gate_2_fired_at')
			.eq('id', mastery_assignment_id)
			.single();

		if (assignmentError || !assignment) {
			return json({ message: 'Assignment not found' }, { status: 404 });
		}
		if (assignment.student_id !== user.id) {
			return json({ message: 'Forbidden' }, { status: 403 });
		}
		if (assignment.current_set !== set_number) {
			return json(
				{ message: `Set ${set_number} is not the active set (current set is ${assignment.current_set})` },
				{ status: 409 }
			);
		}

		const questionIds = answers.map((a) => a.question_id);
		const { data: questions, error: questionsError } = await adminClient
			.from('keystone_questions')
			.select('id, cognitive_patterns, information_types, correct_option_id')
			.in('id', questionIds);

		if (questionsError) throw questionsError;

		const byId = new Map((questions ?? []).map((q) => [q.id, q]));

		let setScore = 0;
		const progressRows: Record<string, unknown>[] = [];

		for (const answer of answers) {
			const question = byId.get(answer.question_id);
			if (!question) continue;

			const isSkipped = answer.selected_option_id == null;
			const isCorrect = !isSkipped && answer.selected_option_id === question.correct_option_id;
			const points = scoreAnswer(isSkipped, isCorrect);
			setScore += points;

			progressRows.push({
				student_id: user.id,
				keystone_question_id: question.id,
				is_correct: isCorrect,
				is_skipped: isSkipped,
				points_awarded: points,
				confidence_rating: answer.confidence_rating ?? null,
				time_taken_ms: answer.time_taken_ms ?? null
			});
		}

		if (progressRows.length === 0) {
			return json({ message: 'No valid answers in batch' }, { status: 400 });
		}

		const { error: upsertError } = await adminClient
			.from('student_question_progress')
			.upsert(progressRows, { onConflict: 'student_id,keystone_question_id' });

		if (upsertError) {
			console.error('submit-mastery-set progress upsert error:', upsertError);
			return json({ message: 'Failed to record set' }, { status: 500 });
		}

		// mastery_state is what makes the gates below possible at all --
		// without this, selectStrengthQuestions/selectAdaptiveQuestions
		// have no signal to weight against.
		for (const answer of answers) {
			const question = byId.get(answer.question_id);
			if (!question) continue;
			const isSkipped = answer.selected_option_id == null;
			const isCorrect = !isSkipped && answer.selected_option_id === question.correct_option_id;

			// Skipped answers carry no signal about whether the student
			// actually knows the combo -- same convention as UTME's
			// submit-answer/submit-daily-set.
			if (!isSkipped) {
				await updateMasteryForAnswer(
					adminClient,
					user.id,
					course_id,
					question.cognitive_patterns,
					question.information_types,
					isCorrect
				);
			}
		}

		// --- Gate logic ---
		const updates: Record<string, unknown> = {};
		let gateFired: 1 | 2 | null = null;
		let gateDegraded = false;

		if (set_number === 1) {
			const excludeIds = [...new Set([...questionIds, ...((assignment.question_sets?.['1'] as number[]) ?? [])])];
			let strengthSet2And3 = await selectStrengthQuestions(adminClient, user.id, course_id, SET_SIZE * 2, excludeIds);

			if (strengthSet2And3.length < SET_SIZE * 2) {
				gateDegraded = true;
				const stillNeeded = SET_SIZE * 2 - strengthSet2And3.length;
				const fallbackExclude = [...excludeIds, ...strengthSet2And3.map((q) => q.id)];
				const fallback = await selectAdaptiveQuestions(adminClient, user.id, course_id, stillNeeded, fallbackExclude);
				strengthSet2And3 = [...strengthSet2And3, ...fallback];
			}

			const set2Ids = strengthSet2And3.slice(0, SET_SIZE).map((q) => q.id);
			const set3Ids = strengthSet2And3.slice(SET_SIZE, SET_SIZE * 2).map((q) => q.id);

			updates.question_sets = { ...assignment.question_sets, '2': set2Ids, '3': set3Ids };
			updates.current_set = 2;
			updates.gate_1_fired_at = new Date().toISOString();
			updates.gate_1_degraded = gateDegraded;
			gateFired = 1;
		} else if (set_number === 3) {
			const excludeIds = [
				...new Set([
					...((assignment.question_sets?.['1'] as number[]) ?? []),
					...((assignment.question_sets?.['2'] as number[]) ?? []),
					...((assignment.question_sets?.['3'] as number[]) ?? [])
				])
			];
			const weaknessSet4And5 = await selectAdaptiveQuestions(adminClient, user.id, course_id, SET_SIZE * 2, excludeIds);

			if (weaknessSet4And5.length < SET_SIZE * 2) {
				gateDegraded = true;
			}

			const set4Ids = weaknessSet4And5.slice(0, SET_SIZE).map((q) => q.id);
			const set5Ids = weaknessSet4And5.slice(SET_SIZE, SET_SIZE * 2).map((q) => q.id);

			updates.question_sets = { ...assignment.question_sets, '4': set4Ids, '5': set5Ids };
			updates.current_set = 4;
			updates.gate_2_fired_at = new Date().toISOString();
			updates.gate_2_degraded = gateDegraded;
			gateFired = 2;
		} else {
			updates.current_set = set_number + 1;
		}

		updates.completed_count = set_number * SET_SIZE;

		const { error: updateError } = await adminClient
			.from('mastery_assignments')
			.update(updates)
			.eq('id', mastery_assignment_id);

		if (updateError) {
			console.error('submit-mastery-set assignment update error:', updateError);
			return json({ message: 'Failed to advance session' }, { status: 500 });
		}

		return json({
			set_number,
			set_score: setScore,
			next_set: updates.current_set,
			gate_fired: gateFired,
			gate_degraded: gateDegraded,
			session_complete: set_number === 5
		});
	} catch (err) {
		console.error('submit-mastery-set error:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
};
