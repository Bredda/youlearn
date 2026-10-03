import { contentSchema } from "@youlearn/content";
import { schema } from "@youlearn/db";
import { recordEvent } from "@youlearn/events/server";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authorizeCourse } from "../../lib/courses";
import {
	changeStatus,
	createRevision,
	deleteRevision,
	findRevision,
	findRevisionDetail,
	generateRevisionKey,
	listRevisions,
	resetPreviewToken,
	saveContent,
} from "../../lib/revisions";

const CONTENT_BODY_LIMIT = 8 * 1024 * 1024;

const courseParams = z.object({ id: z.string().min(1) });
const revisionParams = courseParams.extend({ revisionId: z.string().min(1) });

const createBody = z.object({
	key: z
		.string()
		.trim()
		.min(1)
		.max(64)
		.regex(/^[a-z0-9]+([-_][a-z0-9]+)*$/, "Lowercase letters, digits, - and _")
		.optional(),
	/** The revision to start from (its content is cloned). */
	parentId: z.string().min(1).optional(),
	/** Why the revision exists: mandatory, shown in the history and the review. */
	purpose: z.string().trim().min(1).max(2000),
});

const contentBody = z.object({
	content: contentSchema,
	/** `updatedAt` of the revision as the editor loaded it (optimistic locking). */
	expectedUpdatedAt: z.string().min(1),
});

const statusBody = z.object({
	to: z.enum(schema.revisionStatus.enumValues),
	/** Acknowledges that another revision gets deprecated by this change. */
	confirm: z.boolean().default(false),
});

/** Revisions of a course (writer area): same access rule as the course itself. */
export const writerRevisionRoutes: FastifyPluginAsync = async (app) => {
	app.addHook("preHandler", app.requireWriter);

	// A suggestion for the creation form, not reserved: uniqueness is checked when the revision is created.
	app.get("/api/writer/revision-key", async () => ({
		key: generateRevisionKey(),
	}));

	app.get("/api/writer/courses/:id/revisions", async (request, reply) => {
		const { id } = courseParams.parse(request.params);
		const access = await authorizeCourse(request, reply, id);
		if (!access) return;
		return { revisions: await listRevisions(id) };
	});

	app.get(
		"/api/writer/courses/:id/revisions/:revisionId",
		async (request, reply) => {
			const { id, revisionId } = revisionParams.parse(request.params);
			const access = await authorizeCourse(request, reply, id);
			if (!access) return;
			const revision = await findRevisionDetail(id, revisionId);
			if (!revision)
				return reply.code(404).send({ error: "Revision not found" });
			return { revision };
		},
	);

	// No event per save: contributors record who worked on the revision, the log keeps the milestones.
	app.put(
		"/api/writer/courses/:id/revisions/:revisionId/content",
		// A whole course is saved at once: the default 1 MiB would cap it long before the content limits do.
		{ bodyLimit: CONTENT_BODY_LIMIT },
		async (request, reply) => {
			const { id, revisionId } = revisionParams.parse(request.params);
			const { content, expectedUpdatedAt } = contentBody.parse(request.body);
			const access = await authorizeCourse(request, reply, id);
			if (!access) return;

			const result = await saveContent(
				id,
				revisionId,
				content,
				expectedUpdatedAt,
				access.actor,
			);
			if (!result.ok)
				return reply
					.code(result.status)
					.send({ error: result.error, code: result.code });
			return { revision: await findRevisionDetail(id, revisionId) };
		},
	);

	app.post("/api/writer/courses/:id/revisions", async (request, reply) => {
		const { id } = courseParams.parse(request.params);
		const body = createBody.parse(request.body);
		const access = await authorizeCourse(request, reply, id);
		if (!access) return;
		const { actor, course } = access;

		const result = await createRevision(id, actor, body);
		if (!result.ok)
			return reply.code(result.status).send({ error: result.error });

		const revision = await findRevision(id, result.revisionId);
		if (!revision) throw new Error("Created revision not found");
		await recordEvent(
			{
				type: "revision.create",
				actor: { id: actor.id, label: actor.label },
				target: {
					type: "revision",
					id: revision.id,
					label: `${course.name} · ${revision.key}`,
				},
				metadata: {
					courseId: id,
					purpose: body.purpose,
					...(body.parentId && {
						clonedFrom: (await findRevision(id, body.parentId))?.key,
					}),
				},
			},
			request.log,
		);
		return reply.code(201).send({ revision });
	});

	app.post(
		"/api/writer/courses/:id/revisions/:revisionId/status",
		async (request, reply) => {
			const { id, revisionId } = revisionParams.parse(request.params);
			const { to, confirm } = statusBody.parse(request.body);
			const access = await authorizeCourse(request, reply, id);
			if (!access) return;
			const { actor, course } = access;

			const result = await changeStatus(id, revisionId, to, confirm);
			if (!result.ok)
				return reply
					.code(result.status)
					.send({ error: result.error, code: result.code });

			const by = { id: actor.id, label: actor.label };
			await recordEvent(
				{
					type: "revision.set-status",
					actor: by,
					target: {
						type: "revision",
						id: revisionId,
						label: `${course.name} · ${result.key}`,
					},
					metadata: { courseId: id, from: result.from, to },
				},
				request.log,
			);
			// Publishing took the place of another revision: log it too, or the history would not explain it.
			if (result.deprecated)
				await recordEvent(
					{
						type: "revision.set-status",
						actor: by,
						target: {
							type: "revision",
							id: result.deprecated.id,
							label: `${course.name} · ${result.deprecated.key}`,
						},
						metadata: {
							courseId: id,
							from: "published",
							to: "deprecated",
							replacedBy: result.key,
						},
					},
					request.log,
				);

			return { revision: await findRevision(id, revisionId) };
		},
	);

	// The review link: replace it (the old one stops working) or revoke it.
	for (const revoke of [false, true]) {
		app.route({
			method: revoke ? "DELETE" : "POST",
			url: "/api/writer/courses/:id/revisions/:revisionId/preview-link",
			handler: async (request, reply) => {
				const { id, revisionId } = revisionParams.parse(request.params);
				const access = await authorizeCourse(request, reply, id);
				if (!access) return;
				const { actor, course } = access;

				const result = await resetPreviewToken(id, revisionId, revoke);
				if (!result.ok)
					return reply.code(result.status).send({ error: result.error });

				await recordEvent(
					{
						type: revoke ? "revision.revoke-link" : "revision.new-link",
						actor: { id: actor.id, label: actor.label },
						target: {
							type: "revision",
							id: revisionId,
							label: `${course.name} · ${result.key}`,
						},
						metadata: { courseId: id },
					},
					request.log,
				);
				return { revision: await findRevision(id, revisionId) };
			},
		});
	}

	app.delete(
		"/api/writer/courses/:id/revisions/:revisionId",
		async (request, reply) => {
			const { id, revisionId } = revisionParams.parse(request.params);
			const access = await authorizeCourse(request, reply, id);
			if (!access) return;
			const { actor, course } = access;

			const result = await deleteRevision(id, revisionId);
			if (!result.ok)
				return reply.code(result.status).send({ error: result.error });

			await recordEvent(
				{
					type: "revision.delete",
					actor: { id: actor.id, label: actor.label },
					target: {
						type: "revision",
						id: revisionId,
						label: `${course.name} · ${result.key}`,
					},
					metadata: { courseId: id },
				},
				request.log,
			);
			return reply.code(204).send();
		},
	);
};
