"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountNotes, useAddNote, useDeleteNote } from "@/hooks/use-account-notes";
import { toast } from "sonner";
import { StickyNote, Plus, Trash2, X, Save } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AccountNotesProps {
  username: string;
}

export function AccountNotes({ username }: AccountNotesProps) {
  const { data: notes, isLoading } = useAccountNotes(username);
  const { mutate: addNote, isPending: isAdding } = useAddNote(username);
  const { mutate: deleteNote, isPending: isDeleting } = useDeleteNote(username);

  const [showForm, setShowForm] = useState(false);
  const [newContent, setNewContent] = useState("");

  const handleAdd = () => {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    addNote(trimmed, {
      onSuccess: () => {
        toast.success("Note added");
        setNewContent("");
        setShowForm(false);
      },
      onError: () => toast.error("Failed to add note"),
    });
  };

  const handleDelete = (noteId: string) => {
    if (!window.confirm("Delete this note?")) return;
    deleteNote(noteId, {
      onSuccess: () => toast.success("Note deleted"),
      onError: () => toast.error("Failed to delete note"),
    });
  };

  return (
    <Card className="hover:border-hairline-strong transition-all">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <StickyNote className="size-4 text-amber-500" />
          Notes & Annotations
          {notes && notes.length > 0 && (
            <span className="text-[10px] font-mono text-ink-subtle">
              ({notes.length})
            </span>
          )}
        </CardTitle>
        {!showForm && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8"
            onClick={() => setShowForm(true)}
          >
            <Plus className="mr-1 size-3.5" />
            Add Note
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {showForm && (
          <div className="space-y-2 rounded-[6px] border border-hairline bg-surface-1 p-3">
            <Textarea
              placeholder="Write a note about this creator or saved content..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              className="resize-y text-xs bg-surface-2/40"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7"
                onClick={() => {
                  setShowForm(false);
                  setNewContent("");
                }}
              >
                <X className="mr-1 size-3" />
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs h-7 font-semibold"
                onClick={handleAdd}
                disabled={!newContent.trim() || isAdding}
              >
                <Save className="mr-1 size-3" />
                {isAdding ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-[6px]" />
            <Skeleton className="h-16 w-full rounded-[6px]" />
          </div>
        ) : notes && notes.length > 0 ? (
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group flex gap-3 rounded-[6px] border border-hairline bg-surface-1/40 hover:bg-surface-2 p-3 transition-all"
              >
                <p className="flex-1 text-xs text-ink whitespace-pre-wrap break-words leading-relaxed">
                  {note.content}
                </p>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-red-400 hover:bg-red-500/10 transition-opacity"
                    onClick={() => handleDelete(note.id)}
                    disabled={isDeleting}
                    title="Delete note"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                  <span className="text-[10px] font-mono text-ink-subtle">
                    {formatDistanceToNow(new Date(note.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !showForm && (
            <p className="py-4 text-center text-xs text-ink-muted font-mono">
              No notes yet. Click &ldquo;Add Note&rdquo; to add thoughts or tags.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
