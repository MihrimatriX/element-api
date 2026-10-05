import { Link } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import Seo from "../components/Seo";
import { BackupPanel } from "../components/notebook/BackupPanel";
import { DiscoveryGrid } from "../components/notebook/DiscoveryGrid";
import { LessonCard } from "../components/notebook/LessonCard";
import { NotebookProgress } from "../components/notebook/NotebookProgress";
import { NotebookSync } from "../components/notebook/NotebookSync";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { PageHeader } from "../components/ui/page-header";
import { Section } from "../components/ui/section";
import { track } from "../services/diagnostics";
import { lessons, mergeLearning } from "../services/lessons";
import { useLearning } from "../services/useLearning";

/** The learner's notebook: progress, learning routes, discovered compounds and backups. */
export default function Collection() {
  const learning = useLearning();
  const { progress } = learning;

  function completeLesson(lessonId: string) {
    track("lesson_completed", lessonId);
    learning.save({ ...progress, lessons: [...progress.lessons, lessonId] });
  }

  return (
    <main className="container-page pb-24 pt-10 lg:pt-14">
      <Seo
        title="Defterim · ElementAPI"
        description="Keşif defterim ve altı rota. Su, tuz, pas; oyun skorları burada yok."
        path="/collection"
        noIndex
      />
      <PageHeader
        eyebrow="Defter"
        title="Keşif defterim"
        lead="Laboratuvarda bulduklarını burada tut. Her rota üç bileşik ve kısa bir soru ister."
        actions={
          <Button asChild>
            <Link to="/lab">
              <FlaskConical strokeWidth={1.75} /> Laboratuvara git
            </Link>
          </Button>
        }
        aside={
          <NotebookProgress
            discovered={progress.discoveries.length}
            completedRoutes={progress.lessons.length}
          />
        }
      />
      <NotebookSync learning={learning} />

      <Section
        title="Öğrenme rotaları"
        description="Önce rotanın bileşiklerini laboratuvarda kaydet; üçü de deftere girince soru açılır."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              progress={progress}
              onComplete={completeLesson}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Keşif defterin"
        description="Kurduğun her bileşik, bilimsel kaydına giden bir bağlantı olarak burada kalır."
        actions={
          progress.discoveries.length > 0 && (
            <Badge variant="secondary" className="font-mono tabular">
              {progress.discoveries.length} bileşik
            </Badge>
          )
        }
      >
        <DiscoveryGrid discoveries={progress.discoveries} />
      </Section>

      <Section
        title="Yedek ve aktarım"
        description="Defter bu tarayıcıda durur. Başka bir cihaza taşımak ya da saklamak için dosyaya al."
      >
        <BackupPanel
          progress={progress}
          onRestore={(incoming) =>
            learning.save(mergeLearning(progress, incoming))
          }
        />
      </Section>
    </main>
  );
}
