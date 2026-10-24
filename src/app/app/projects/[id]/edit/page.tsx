"use client";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Player, type PlayerRef } from "@remotion/player";
import { ChevronLeft, Download, Redo2, RotateCcw, Sparkles, Undo2 } from "lucide-react";
import { api } from "@/lib/api";
import { Report } from "@/remotion/Report";
import { useSession } from "@/components/session";
import { Button, ErrorNote, Spinner } from "@/components/ui";
import { Timeline } from "@/components/editor/timeline";
import { Inspector } from "@/components/editor/inspector";
import { type Doc, type Selection, FPS, newOverlay, newScene, sizeFor, totalSec, useDocHistory } from "@/components/editor/state";

type EditorProject = {
  id: string; title: string; status: string; progress: number; style: string; voice: string; aspect: string;
  durationSec: number | null; creditsCharged: number; hasDraft: boolean; multiplier: number; error: string | null;
};

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ project: EditorProject; doc: Doc } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ project: EditorProject; doc: Doc }>(`/editor/${id}`).then(setData).catch((e) => setError((e as Error).message));
  }, [id]);
  if (error) return <div className="grid min-h-screen place-items-center p-6"><div className="max-w-md space-y-4 text-center"><ErrorNote>{error}</ErrorNote><Button href={`/app/projects/${id}`}>Back to project</Button></div></div>;
  if (!data) return <div className="grid min-h-screen place-items-center"><Spinner className="size-8" /></div>;
  return <Editor key={id} project={data.project} initial={data.doc} />;
}

function Editor({ project: initialProject, initial }: { project: EditorProject; initial: Doc }) {
  const { refresh } = useSession();
  const [project, setProject] = useState(initialProject);
  const { doc, commit, undo, redo, reset, canUndo, canRedo } = useDocHistory(initial);
  const [selection, setSelection] = useState<Selection>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "error">(initialProject.hasDraft ? "unsaved" : "saved");
  const [exporting, setExporting] = useState<null | { progress: number }>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const player = useRef<PlayerRef>(null);
  const musicInput = useRef<HTMLInputElement>(null);
  const first = useRef(true);

  const total = totalSec(doc);
  const durationInFrames = Math.max(FPS, Math.round(doc.scenes.reduce((s, sc) => s + Math.round(sc.durationSec * FPS), 0)));
  const { width, height } = sizeFor(doc.aspect);
  const time = frame / FPS;
  const extraCredits = Math.max(0, Math.ceil(total * project.multiplier) - project.creditsCharged);

  // Autosave the draft shortly after each change.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSaveState("unsaved");
    const t = setTimeout(async () => {
      setSaveState("saving");
      try { await api(`/editor/${project.id}`, { method: "PUT", json: { doc } }); setSaveState("saved"); }
      catch { setSaveState("error"); }
    }, 1200);
    return () => clearTimeout(t);
  }, [doc, project.id]);

  // Keep the playhead and play state in sync with the player.
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    return () => { p.removeEventListener("frameupdate", onFrame); p.removeEventListener("play", onPlay); p.removeEventListener("pause", onPause); };
  }, [doc.aspect]);

  const seek = useCallback((sec: number) => { player.current?.seekTo(Math.round(sec * FPS)); setFrame(Math.round(sec * FPS)); }, []);
  const togglePlay = useCallback(() => player.current?.toggle(), []);

  const deleteSelected = useCallback(() => {
    if (!selection) return;
    if (selection.kind === "scene") commit((d) => ({ ...d, scenes: d.scenes.filter((s) => s.id !== selection.id) }));
    else if (selection.kind === "overlay") commit((d) => ({ ...d, overlays: (d.overlays ?? []).filter((o) => o.id !== selection.id) }));
    else commit((d) => ({ ...d, music: null }));
    setSelection(null);
  }, [selection, commit]);

  // Keyboard shortcuts (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); seek(Math.max(0, time - (e.shiftKey ? 5 : 1))); }
      else if (e.key === "ArrowRight") { e.preventDefault(); seek(Math.min(total, time + (e.shiftKey ? 5 : 1))); }
      else if (e.key === "Escape") setSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, undo, redo, deleteSelected, seek, time, total]);

  function addScene() {
    const sc = newScene();
    const at = selection?.kind === "scene" ? doc.scenes.findIndex((s) => s.id === selection.id) + 1 : doc.scenes.length;
    commit((d) => ({ ...d, scenes: [...d.scenes.slice(0, at), sc, ...d.scenes.slice(at)] }));
    setSelection({ kind: "scene", id: sc.id });
  }
  function addText() {
    const o = newOverlay(time, total);
    commit((d) => ({ ...d, overlays: [...(d.overlays ?? []), o] }));
    setSelection({ kind: "overlay", id: o.id });
  }
  async function uploadMusic(f: File) {
    setError("");
    setNotice("Uploading music…");
    const fd = new FormData();
    fd.append("file", f);
    try {
      const m = await api<{ kind: string; url: string; name: string }>(`/editor/${project.id}/upload`, { method: "POST", body: fd });
      if (m.kind !== "audio") throw new Error("Choose an audio file (MP3, WAV, M4A).");
      commit((d) => ({ ...d, music: { url: m.url, name: m.name, volume: 0.25, duck: true } }));
      setSelection({ kind: "music" });
      setNotice("");
    } catch (e) { setError((e as Error).message); setNotice(""); }
  }

  async function discard() {
    if (!confirm("Discard all unexported changes and go back to the last exported video?")) return;
    await api(`/editor/${project.id}/draft`, { method: "DELETE" });
    const d = await api<{ project: EditorProject; doc: Doc }>(`/editor/${project.id}`);
    first.current = true;
    reset(d.doc);
    setProject(d.project);
    setSaveState("saved");
    setSelection(null);
  }

  async function exportVideo() {
    setError("");
    try {
      await api(`/editor/${project.id}/export`, { method: "POST", json: { doc } });
      setExporting({ progress: 70 });
      player.current?.pause();
      // Poll until the render finishes.
      for (;;) {
        await new Promise((r) => setTimeout(r, 2500));
        const d = await api<{ project: EditorProject; doc: Doc }>(`/editor/${project.id}`);
        setExporting({ progress: d.project.progress });
        if (!["queued", "rendering", "composing"].includes(d.project.status)) {
          setProject(d.project);
          if (d.project.hasDraft) { setError("The export didn't finish. Your edits are saved; check the project's activity log and try again."); }
          else { setNotice("Exported! Your edited video is ready."); first.current = true; reset(d.doc); setSaveState("saved"); }
          break;
        }
      }
      void refresh();
    } catch (e) { setError((e as Error).message); } finally { setExporting(null); }
  }

  const inputProps = useMemo(() => doc as unknown as Record<string, unknown>, [doc]);
  const playerSize = useMemo(() => (doc.aspect === "9:16" ? { maxWidth: 360 } : doc.aspect === "1:1" ? { maxWidth: 560 } : { maxWidth: 960 }), [doc.aspect]);

  return (
    <div className="flex h-screen flex-col bg-bg">
      {/* top bar */}
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-2.5">
        <Link href={`/app/projects/${project.id}`} className="flex items-center gap-1 text-sm text-muted hover:text-fg"><ChevronLeft className="size-4" /> Project</Link>
        <div className="h-5 w-px bg-line" />
        <p className="min-w-0 max-w-[30ch] truncate font-semibold">{project.title}</p>
        <span className="text-xs text-muted">{saveState === "saving" ? "Saving…" : saveState === "unsaved" ? "Unsaved changes" : saveState === "error" ? "Couldn't save" : "All changes saved"}</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={undo} disabled={!canUndo} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30" title="Undo (⌘Z)" aria-label="Undo"><Undo2 className="size-4" /></button>
          <button onClick={redo} disabled={!canRedo} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30" title="Redo (⇧⌘Z)" aria-label="Redo"><Redo2 className="size-4" /></button>
          {(project.hasDraft || saveState !== "saved") && <Button variant="ghost" size="sm" onClick={discard}><RotateCcw className="size-3.5" /> Discard edits</Button>}
          <Button variant="secondary" size="sm" href={`/api/projects/${project.id}/video?download=1`}><Download className="size-3.5" /> Last export</Button>
          <Button size="sm" loading={!!exporting} onClick={exportVideo} title={extraCredits ? `Adds ${extraCredits} credits for the extra length` : "Free: no longer than what you paid for"}>
            <Sparkles className="size-3.5" /> Export{extraCredits ? ` · ${extraCredits} credits` : ""}
          </Button>
        </div>
      </header>

      {(error || notice) && (
        <div className="border-b border-line bg-white px-4 py-2">
          {error ? <ErrorNote>{error}</ErrorNote> : <p className="text-sm text-emerald-700">{notice} {notice.startsWith("Exported") && <Link className="font-medium underline" href={`/app/projects/${project.id}`}>View it</Link>}</p>}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* preview */}
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 p-4 sm:p-6">
          <div className="w-full overflow-hidden rounded-xl bg-black shadow-xl" style={playerSize}>
            <Player
              ref={player}
              component={Report as unknown as React.ComponentType<Record<string, unknown>>}
              inputProps={inputProps}
              durationInFrames={durationInFrames}
              fps={FPS}
              compositionWidth={width}
              compositionHeight={height}
              style={{ width: "100%", aspectRatio: `${width} / ${height}` }}
              clickToPlay
              doubleClickToFullscreen
              spaceKeyToPlayOrPause={false}
              numberOfSharedAudioTags={8}
            />
          </div>
          <p className="text-xs text-muted">Space to play · ← → to step · ⌘Z to undo · Delete removes the selected item</p>
        </div>

        {/* inspector */}
        <aside className="hidden w-[360px] shrink-0 overflow-y-auto border-l border-line bg-white md:block">
          <Inspector doc={doc} commit={commit} projectId={project.id} voice={project.voice} time={time} selection={selection} onSelect={setSelection} />
        </aside>
      </div>

      {/* timeline */}
      <div className="h-[220px] shrink-0">
        <Timeline doc={doc} time={time} playing={playing} selection={selection} onSeek={seek} onTogglePlay={togglePlay}
          onSelect={setSelection} onCommit={commit} onAddScene={addScene} onAddText={addText} onAddMusic={() => musicInput.current?.click()} />
      </div>
      <input ref={musicInput} type="file" hidden accept=".mp3,.wav,.m4a,.aac,.ogg" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadMusic(f); e.target.value = ""; }} />

      {exporting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-indigo-950/40">
          <div className="shadow-card w-80 rounded-2xl bg-white p-6 text-center">
            <p className="font-semibold">Exporting your video…</p>
            <p className="mt-1 text-sm text-muted">This takes about as long as the video. You can keep this tab open.</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full bg-brand transition-all" style={{ width: `${exporting.progress}%` }} /></div>
            <p className="mt-2 text-xs text-muted">{exporting.progress}%</p>
          </div>
        </div>
      )}
    </div>
  );
}
