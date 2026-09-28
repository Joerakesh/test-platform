import connectDB from "./db";
import User from "@/models/User";
import Classroom from "@/models/Classroom";
import { seededShuffle } from "./shuffle";

export async function findOrCreateClassroom({ className, section, academicYear }, createdBy) {
  const name = String(className || "").trim().toUpperCase();
  const sec = String(section || "A").trim().toUpperCase();
  if (!name) return null;

  const existing = await Classroom.findOne({ name, section: sec });
  if (existing) return existing;

  return Classroom.create({
    name,
    section: sec,
    academicYear: academicYear || new Date().getFullYear() + " - " + (new Date().getFullYear() + 1),
    createdBy: createdBy || null,
  });
}

export async function resolveAudience({ assignedStudents, assignedClassrooms }, ownerId) {
  const ids = new Set();
  for (const id of assignedStudents || []) {
    if (id) ids.add(String(id));
  }

  if (assignedClassrooms?.length) {
    await connectDB();
    const criteria = { role: "student", classroomId: { $in: assignedClassrooms } };
    if (ownerId) criteria.createdBy = ownerId;
    const students = await User.find(criteria).select("_id");
    for (const s of students) ids.add(String(s._id));
  }

  return [...ids];
}

export function presentPaper(test, seed) {
  const entries = (test.questions || []).map((question, originalIndex) => ({ question, originalIndex }));
  const ordered = test.shuffleQuestions ? seededShuffle(entries, `${seed}:q`) : entries;

  return ordered.map(({ question, originalIndex }) => {
    const options = (question.options || []).map((text, key) => ({ text, key }));
    const shuffledOptions =
      test.shuffleOptions && options.length > 1
        ? seededShuffle(options, `${seed}:o:${originalIndex}`)
        : options;

    return {
      originalIndex,
      type: question.type,
      text: question.text,
      marks: question.marks,
      options: shuffledOptions,
      chapter: question.chapter || "",
      topic: question.topic || "",
    };
  });
}

export function seedFor(sessionId, userId) {
  return `${sessionId}:${userId}`;
}
