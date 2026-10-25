import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, PlayCircleIcon } from "@hugeicons/core-free-icons";
import { CustomerPage } from "@/components/dashboard/customer-page";
import { EmptyState, PageHeader, SectionLabel } from "@/components/page-header";
import { listTutorials, type Tutorial } from "@/lib/tutorials";
import { videoEmbedUrl } from "@/lib/video-embed";

export const dynamic = "force-dynamic";

function TutorialItem({ t }: { t: Tutorial }) {
  const embed = videoEmbedUrl(t.videoUrl);
  return (
    <details className="group surface rounded-2xl">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2.5">
          {t.videoUrl && <HugeiconsIcon icon={PlayCircleIcon} strokeWidth={1.75} className="size-4 shrink-0 text-primary" />}
          <span className="truncate text-sm font-medium">{t.title}</span>
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="flex flex-col gap-4 px-5 pb-5">
        {embed ? (
          <div className="aspect-video overflow-hidden rounded-xl bg-black/40">
            <iframe
              src={embed}
              title={t.title}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="size-full"
            />
          </div>
        ) : (
          t.videoUrl && (
            <a href={t.videoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline underline-offset-4">
              Watch the video
            </a>
          )
        )}
        {t.body && <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{t.body}</p>}
      </div>
    </details>
  );
}

export default async function TutorialsPage() {
  const tutorials = await listTutorials();
  const topics = new Map<string, Tutorial[]>();
  for (const t of tutorials) topics.set(t.topic, [...(topics.get(t.topic) ?? []), t]);

  return (
    <CustomerPage>
      <PageHeader title="Tutorials" description="Step-by-step guides and videos for using your logs." />
      <div className="mt-6 flex flex-col gap-8">
        {topics.size === 0 ? (
          <EmptyState title="No tutorials yet" description="Guides will appear here soon." />
        ) : (
          Array.from(topics.entries()).map(([topic, items]) => (
            <section key={topic} className="flex flex-col gap-3">
              <SectionLabel>{topic}</SectionLabel>
              <div className="flex flex-col gap-2">
                {items.map((t) => (
                  <TutorialItem key={t.id} t={t} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </CustomerPage>
  );
}
