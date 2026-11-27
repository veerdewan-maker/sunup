import { useEffect, useRef, useState } from 'react';
import { Chips, Empty, Sheet, toast } from '../components/ui';
import { niceDate, shortDate, ymd } from '../lib/util';
import { addPhoto, deletePhoto, getPhoto, useStore } from '../store';
import type { PhotoMeta, Pose } from '../types';

const POSES: { value: Pose; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'side', label: 'Side' },
  { value: 'back', label: 'Back' },
];

/** Shrinks a camera photo to at most 1080 px on the long side, so dozens fit comfortably on the phone. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, 1080 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', 0.82));
}

function PhotoImg({ id, alt, className }: { id: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    let live = true;
    getPhoto(id).then((b) => {
      if (b && live) {
        u = URL.createObjectURL(b);
        setUrl(u);
      }
    });
    return () => {
      live = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);
  return url ? <img src={url} alt={alt} className={className} /> : <div className={(className ?? '') + ' photo-blank'} role="img" aria-label={alt} />;
}

function PhotoPicker({ label, list, value, onChange }: { label: string; list: PhotoMeta[]; value: string; onChange: (id: string) => void }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {list.map((p) => (
        <option key={p.id} value={p.id}>
          {shortDate(p.date)}
        </option>
      ))}
    </select>
  );
}

export function PhotosCard() {
  const s = useStore();
  const [pose, setPose] = useState<Pose>('front');
  const [viewing, setViewing] = useState<PhotoMeta | null>(null);
  const [comparing, setComparing] = useState<{ a: string; b: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const list = s.photos.filter((p) => p.pose === pose);
  const label = POSES.find((p) => p.value === pose)!.label.toLowerCase();

  return (
    <section className="card">
      <div className="card-head">
        <h2>Photos</h2>
        <span className="muted">Only on this phone</span>
      </div>
      <Chips cols={3} label="Photo pose" value={pose} onChange={setPose} options={POSES} />
      {list.length === 0 ? (
        <Empty>Take a {label} photo every few weeks in the same spot and light. Side by side, they show changes the scale misses.</Empty>
      ) : (
        <div className="photo-grid">
          {[...list].reverse().map((p) => (
            <button key={p.id} className="photo-tile" onClick={() => setViewing(p)} aria-label={`Open ${label} photo from ${niceDate(p.date)}`}>
              <PhotoImg id={p.id} alt="" className="photo-img" />
              <span>{shortDate(p.date)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="btn-row">
        <button className="btn small primary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Saving…' : `Add ${label} photo`}
        </button>
        {list.length >= 2 && (
          <button className="btn small" onClick={() => setComparing({ a: list[0].id, b: list[list.length - 1].id })}>
            Compare
          </button>
        )}
      </div>
      <p className="muted small">Photos are not sent anywhere and are not included in backup files.</p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        aria-label="Progress photo file"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          setBusy(true);
          try {
            await addPhoto(ymd(), pose, await shrink(f));
            toast('Photo saved');
          } catch {
            toast('That photo could not be saved. The phone may be low on space.');
          } finally {
            setBusy(false);
          }
        }}
      />

      {viewing && (
        <Sheet title={`${POSES.find((p) => p.value === viewing.pose)!.label} · ${niceDate(viewing.date)}`} onClose={() => setViewing(null)}>
          <PhotoImg id={viewing.id} alt={`Progress photo from ${niceDate(viewing.date)}`} className="photo-full" />
          <button
            className="btn block danger"
            onClick={async () => {
              await deletePhoto(viewing.id);
              setViewing(null);
              toast('Photo deleted');
            }}
          >
            Delete photo
          </button>
        </Sheet>
      )}

      {comparing && (
        <Sheet title="Before and after" onClose={() => setComparing(null)}>
          <div className="photo-compare">
            <div>
              <PhotoPicker label="Before photo" list={list} value={comparing.a} onChange={(a) => setComparing({ ...comparing, a })} />
              <PhotoImg id={comparing.a} alt="Before" className="photo-img" />
            </div>
            <div>
              <PhotoPicker label="After photo" list={list} value={comparing.b} onChange={(b) => setComparing({ ...comparing, b })} />
              <PhotoImg id={comparing.b} alt="After" className="photo-img" />
            </div>
          </div>
        </Sheet>
      )}
    </section>
  );
}
