import { db, eq, schema } from "@youlearn/db";
import { recordEvent } from "@youlearn/events/server";
import type { AssignableGroups, WriterCourse } from "@youlearn/types";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
	assignableGroups,
	authorizeCourse,
	type CourseActor,
	findCourse,
	getCourseActor,
	listCourses,
	normalizeCategories,
	resolveGroupIds,
	slugify,
} from "../../lib/courses";
import { isUniqueViolation } from "../../lib/groups";

const { course, courseGroup } = schema;

const idParams = z.object({ id: z.string().min(1) });
const listQuery = z.object({ q: z.string().trim().max(100).optional() });

const fields = {
	name: z.string().trim().min(1).max(120),
	slug: z
		.string()
		.trim()
		.min(1)
		.max(80)
		.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, digits and hyphens"),
	description: z.string().trim().max(5000),
	categories: z.array(z.string().trim().max(40)).max(20),
	groupIds: z.array(z.string().min(1)).max(200),
};

const createBody = z.object({
	name: fields.name,
	// Derived from the name when omitted.
	slug: fields.slug.optional(),
	description: fields.description.default(""),
	categories: fields.categories.default([]),
	groupIds: fields.groupIds,
});

const updateBody = z.object({
	name: fields.name.optional(),
	slug: fields.slug.optional(),
	description: fields.description.optional(),
	categories: fields.categories.optional(),
	groupIds: fields.groupIds.optional(),
});

const SLUG_TAKEN = "A course with this slug already exists";
const clip = (text: string) =>
	text.length > 120 ? `${text.slice(0, 120)}…` : text;
const names = (groups: { name: string }[]) =>
	groups.map((g) => g.name).sort((a, b) => a.localeCompare(b));

/**
 * Course CRUD for the writer area. An admin sees and edits every course, a writer only the courses that share
 * one of their groups, and can only assign their own groups (see `resolveGroupIds`).
 */
export const writerCourseRoutes: FastifyPluginAsync = async (app) => {
	app.addHook("preHandler", app.requireWriter);

	const eventActor = (actor: CourseActor) => ({
		id: actor.id,
		label: actor.label,
	});

	app.get("/api/writer/groups", async (request): Promise<AssignableGroups> => {
		const actor = await getCourseActor(request);
		return { groups: await assignableGroups(actor) };
	});

	app.get("/api/writer/courses", async (request) => {
		const { q } = listQuery.parse(request.query);
		const actor = await getCourseActor(request);
		return { courses: await listCourses(actor, q) };
	});

	app.get("/api/writer/courses/:id", async (request, reply) => {
		const { id } = idParams.parse(request.params);
		const access = await authorizeCourse(request, reply, id);
		if (!access) return;
		return { course: access.course };
	});

	app.post("/api/writer/courses", async (request, reply) => {
		const body = createBody.parse(request.body);
		const actor = await getCourseActor(request);
		const manageable = await assignableGroups(actor);
		const resolved = resolveGroupIds(actor, manageable, [], body.groupIds);
		if ("error" in resolved)
			return reply.code(resolved.status).send({ error: resolved.error });

		const slug = body.slug ?? slugify(body.name);
		if (!slug)
			return reply
				.code(400)
				.send({ error: "The name does not give a usable slug, set one" });

		let id: string;
		try {
			id = await db.transaction(async (tx) => {
				const [created] = await tx
					.insert(course)
					.values({
						name: body.name,
						slug,
						description: body.description,
						categories: normalizeCategories(body.categories),
					})
					.returning({ id: course.id });
				if (!created) throw new Error("Course insert returned no row");
				await tx
					.insert(courseGroup)
					.values(
						resolved.ids.map((groupId) => ({ courseId: created.id, groupId })),
					);
				return created.id;
			});
		} catch (error) {
			if (isUniqueViolation(error))
				return reply.code(409).send({ error: SLUG_TAKEN });
			throw error;
		}

		const created = await findCourse(id);
		if (!created) throw new Error("Created course not found");
		await recordEvent(
			{
				type: "course.create",
				actor: eventActor(actor),
				target: { type: "course", id, label: created.name },
				metadata: { slug: created.slug, groups: names(created.groups) },
			},
			request.log,
		);
		return reply.code(201).send({ course: created });
	});

	app.patch("/api/writer/courses/:id", async (request, reply) => {
		const { id } = idParams.parse(request.params);
		const body = updateBody.parse(request.body);
		const access = await authorizeCourse(request, reply, id);
		if (!access) return;
		const { actor, course: previous } = access;

		// Published once: the slug is part of links learners may have.
		if (
			body.slug !== undefined &&
			body.slug !== previous.slug &&
			previous.everPublished
		)
			return reply
				.code(409)
				.send({ error: "The slug of a published course cannot change" });

		let groupIds: string[] | undefined;
		if (body.groupIds) {
			const manageable = await assignableGroups(actor);
			const resolved = resolveGroupIds(
				actor,
				manageable,
				previous.groups,
				body.groupIds,
			);
			if ("error" in resolved)
				return reply.code(resolved.status).send({ error: resolved.error });
			groupIds = resolved.ids;
		}

		const values = {
			...(body.name !== undefined && { name: body.name }),
			...(body.slug !== undefined && { slug: body.slug }),
			...(body.description !== undefined && { description: body.description }),
			...(body.categories !== undefined && {
				categories: normalizeCategories(body.categories),
			}),
		};

		try {
			await db.transaction(async (tx) => {
				if (Object.keys(values).length > 0)
					await tx.update(course).set(values).where(eq(course.id, id));
				if (groupIds) {
					await tx.delete(courseGroup).where(eq(courseGroup.courseId, id));
					await tx
						.insert(courseGroup)
						.values(groupIds.map((groupId) => ({ courseId: id, groupId })));
				}
			});
		} catch (error) {
			if (isUniqueViolation(error))
				return reply.code(409).send({ error: SLUG_TAKEN });
			throw error;
		}

		const updated = await findCourse(id);
		if (!updated) return reply.code(404).send({ error: "Course not found" });

		// The form always sends every field: only log what really changed.
		const changes: Record<string, { from: unknown; to: unknown }> = {};
		if (updated.name !== previous.name)
			changes.name = { from: previous.name, to: updated.name };
		if (updated.slug !== previous.slug)
			changes.slug = { from: previous.slug, to: updated.slug };
		if (updated.description !== previous.description)
			changes.description = {
				from: clip(previous.description),
				to: clip(updated.description),
			};
		if (updated.categories.join() !== previous.categories.join())
			changes.categories = {
				from: previous.categories,
				to: updated.categories,
			};
		const target = { type: "course", id, label: updated.name };
		if (Object.keys(changes).length > 0)
			await recordEvent(
				{
					type: "course.update",
					actor: eventActor(actor),
					target,
					metadata: { changes },
				},
				request.log,
			);

		const from = names(previous.groups);
		const to = names(updated.groups);
		if (from.join() !== to.join())
			await recordEvent(
				{
					type: "course.set-groups",
					actor: eventActor(actor),
					target,
					metadata: { from, to },
				},
				request.log,
			);

		return { course: updated satisfies WriterCourse };
	});

	// A course published once is archived (admin only) to keep what learners did; the others are really deleted.
	app.delete("/api/writer/courses/:id", async (request, reply) => {
		const { id } = idParams.parse(request.params);
		const access = await authorizeCourse(request, reply, id);
		if (!access) return;
		const { actor, course: found } = access;

		const archived = found.everPublished;
		if (archived && !actor.admin)
			return reply
				.code(403)
				.send({ error: "Only an admin can archive a published course" });

		if (archived)
			// An archived course has no audience left, so its groups can be deleted again.
			await db.transaction(async (tx) => {
				await tx
					.update(course)
					.set({ deletedAt: new Date() })
					.where(eq(course.id, id));
				await tx.delete(courseGroup).where(eq(courseGroup.courseId, id));
			});
		else await db.delete(course).where(eq(course.id, id));

		await recordEvent(
			{
				type: "course.delete",
				actor: eventActor(actor),
				target: { type: "course", id, label: found.name },
				metadata: {
					slug: found.slug,
					archived,
					...(archived && { groups: names(found.groups) }),
				},
			},
			request.log,
		);
		return reply.code(204).send();
	});
};
