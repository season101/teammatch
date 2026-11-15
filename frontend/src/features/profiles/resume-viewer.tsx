"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileIcon } from "@/components/ui/link-card";
import { SkeletonCard } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { openPdf, type PDFDocumentProxy } from "./open-pdf";
import { resumeUrl, useMyProfile } from "./queries";

// 50% to 200% in steps of 25%. 100% fits the page to the column.
const ZOOMS = [50, 75, 100, 125, 150, 175, 200];

type Load =
  | { state: "loading" }
  | { state: "denied" }
  | { state: "broken" }
  | { state: "ready"; pdf: PDFDocumentProxy };

// Screen 53 (F1-17): someone's resume inside the app, pages in one column. The file comes
// from the API after its permission check (DD-42), so there's never a public link.
export function ResumeViewer({ profileId }: { profileId: number }) {
  const router = useRouter();
  const me = useMyProfile();
  const person = useQuery({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      const { data } = await api.GET("/api/v1/profiles/{id}/", {
        params: { path: { id: profileId } },
      });
      return data ?? null;
    },
  });
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [zoom, setZoom] = useState(2); // index into ZOOMS: 100%
  const [current, setCurrent] = useState(1);
  const column = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let pdf: PDFDocumentProxy | undefined;
    (async () => {
      const response = await fetch(resumeUrl(profileId), { credentials: "same-origin" });
      // 403 or 404: nothing was sent, and the person sees why.
      if (!response.ok) return { state: "denied" } as const;
      pdf = await openPdf(await response.arrayBuffer());
      return { state: "ready", pdf } as const;
    })()
      .catch(() => ({ state: "broken" }) as const)
      .then((next) => !cancelled && setLoad(next));
    return () => {
      cancelled = true;
      pdf?.loadingTask.destroy();
    };
  }, [profileId]);

  // The column's width sets 100%, and follows rotation and window resizes.
  useEffect(() => {
    const element = column.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, [load.state]);

  const name = person.data?.display_name || "";
  const first = name.split(/\s+/)[0] || "this person";
  const download = `${resumeUrl(profileId)}?download=1`;

  // Back to the applicant or profile it was opened from. Opened from a link, there's no
  // history in the app, so go to my profile or Review.
  function back() {
    if (window.history.length > 1) router.back();
    else router.push(me.data?.id === profileId ? "/profile" : "/applicants");
  }

  return (
    <div className="flex min-h-svh flex-1 flex-col bg-bg">
      <header className="sticky top-0 z-10 flex min-h-14 items-center gap-2 border-b border-border bg-bg/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur">
        <button
          type="button"
          onClick={back}
          className={`${buttonClasses("ghost", "sm")} shrink-0`}
        >
          <span aria-hidden="true">‹</span> Back
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center font-semibold">
          {name ? `${name}'s resume` : "Resume"}
        </h1>
        <p role="status" className="w-16 shrink-0 text-right text-sm text-muted tabular-nums">
          {load.state === "ready" && `${current} of ${load.pdf.numPages}`}
        </p>
      </header>

      {load.state === "loading" && (
        <div className="flex-1 p-4">
          <SkeletonCard label="Loading the resume" className="h-[70svh]" />
        </div>
      )}
      {load.state === "denied" && (
        <EmptyState icon={<FileIcon />} title="You can't open this resume">
          Only owners of projects {first} applied to can read it.
        </EmptyState>
      )}
      {load.state === "broken" && (
        <EmptyState
          icon={<FileIcon />}
          title="This file won't display here"
          action={
            <a href={download} className={buttonClasses("cta")}>
              Download instead
            </a>
          }
        >
          It may be damaged, or use something the viewer can&apos;t read.
        </EmptyState>
      )}
      {load.state === "ready" && (
        <>
          {/* Zoomed past the column, the pages scroll sideways here, not the whole screen. */}
          <div ref={column} className="flex-1 overflow-x-auto p-4">
            <div className="mx-auto flex w-max min-w-full flex-col items-center gap-4">
              {Array.from({ length: load.pdf.numPages }, (_, i) => (
                <PdfPage
                  key={i + 1}
                  pdf={load.pdf}
                  number={i + 1}
                  width={(width - 32) * (ZOOMS[zoom] / 100)}
                  onInView={setCurrent}
                />
              ))}
            </div>
          </div>
          <footer className="sticky bottom-0 flex items-center gap-1 border-t border-border bg-bg/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur">
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoom === 0}
              onClick={() => setZoom(zoom - 1)}
              className={`${buttonClasses("ghost")} min-w-11 px-0 text-xl`}
            >
              −
            </button>
            <span className="w-14 text-center font-mono text-sm tabular-nums">
              {ZOOMS[zoom]}%
            </span>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoom === ZOOMS.length - 1}
              onClick={() => setZoom(zoom + 1)}
              className={`${buttonClasses("ghost")} min-w-11 px-0 text-xl`}
            >
              +
            </button>
            <a href={download} className={`${buttonClasses("ghost")} ml-auto`}>
              Download
            </a>
          </footer>
        </>
      )}
    </div>
  );
}

// One page, drawn to a canvas at the column's width times the zoom, sharp on 2x screens.
function PdfPage({
  pdf,
  number,
  width,
  onInView,
}: {
  pdf: PDFDocumentProxy;
  number: number;
  width: number;
  onInView: (number: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (width <= 0) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<unknown> } | undefined;
    pdf.getPage(number).then((page) => {
      const element = canvas.current;
      if (cancelled || !element) return;
      const ratio = window.devicePixelRatio || 1;
      const scale = width / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale: scale * ratio });
      element.width = viewport.width;
      element.height = viewport.height;
      element.style.width = `${viewport.width / ratio}px`;
      element.style.height = `${viewport.height / ratio}px`;
      task = page.render({ canvas: element, viewport });
      task.promise.catch(() => {}); // cancelled by a newer zoom
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, number, width]);

  // The page crossing the middle of the screen is the one "in view".
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && onInView(number),
      { rootMargin: "-50% 0px -50% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [number, onInView]);

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={`Page ${number} of ${pdf.numPages}`}
      className="rounded-row bg-white shadow-card"
    />
  );
}
