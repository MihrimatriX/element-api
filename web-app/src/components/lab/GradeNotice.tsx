import { Notice } from "@/components/ui/notice";
import type { Tone } from "@/components/ui/classes";

/** A graded answer from the side games. */
export interface Grade {
  ok: boolean;
  message: string;
}

function look(grade: Grade | null): { tone: Tone; title?: string } {
  if (!grade) return { tone: "neutral" };
  return grade.ok
    ? { tone: "success", title: "Doğru" }
    : { tone: "warning", title: "Henüz değil" };
}

/**
 * Always-mounted status for the side games: the instruction until an answer is
 * checked, then the result. Staying mounted keeps the live region announcing.
 */
export function GradeNotice({ grade, idle }: { grade: Grade | null; idle: string }) {
  const { tone, title } = look(grade);
  return (
    <Notice tone={tone} title={title} role="status" className="mt-5">
      {grade?.message ?? idle}
    </Notice>
  );
}
