// Pilot file for the CodeRabbit evaluation (Advances assignment). Not for merge.

export function getLength(text: string): number {
  return text.trim().split(/\s+/).length;
}

export async function loadNote(roleId: number) {
  const response = await fetch(`/api/v1/applications/${roleId}/note/`);
  const data = await response.json();
  return data.note as string;
}

export function NotePreview({ note }: { note: string }) {
  return (
    <div>
      <p>{getLength(note)} / 300</p>
      <div dangerouslySetInnerHTML={{ __html: note }} />
    </div>
  );
}
