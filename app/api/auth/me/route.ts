// @ts-nocheck
import { requireUser, loadUser, noStore, jsonError } from "@/lib/guard";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;

  const user = await loadUser(session);
  if (!user) return jsonError("User not found.", 404);

  return noStore({
    user: {
      id: user._id,
      name: user.name,
      role: user.role,
      email: user.email,
      username: user.username,
      subject: user.subject,
      rollNo: user.rollNo,
      classroomId: user.classroomId
        ? {
            id: user.classroomId._id,
            name: user.classroomId.name,
            section: user.classroomId.section,
            academicYear: user.classroomId.academicYear,
          }
        : null,
    },
  });
}
