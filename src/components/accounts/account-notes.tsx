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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <StickyNote className="h-4 w-4" />
            Notes
            {notes && notes.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                ({notes.length})
              </span>
            )}
          </CardTitle>
          {!showForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Note
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Add note form */}
        {showForm && (
          <div className="space-y-2 rounded-lg border p-3">
            <Textarea
              placeholder="Write a note..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              className="resize-y text-sm"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setNewContent("");
                }}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!newContent.trim() || isAdding}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {isAdding ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}

        {/* Notes list */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : notes && notes.length > 0 ? (
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group flex gap-3 rounded-lg border bg-muted/30 p-3"
              >
                <p className="flex-1 text-sm whitespace-pre-wrap break-words">
                  {note.content}
                </p>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    onClick={() => handleDelete(note.id)}
                    disabled={isDeleting}
                    title="Delete note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
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
            <p className="py-4 text-center text-sm text-muted-foreground">
              No notes yet. Click &ldquo;Add Note&rdquo; to get started.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
