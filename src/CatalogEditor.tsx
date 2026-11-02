import {useCatalogBusy} from './useCatalogBusy';
import {NativeSelect} from '@/components/ui/native-select';
import {Textarea} from '@/components/ui/textarea';
import {Input} from '@/components/ui/input';
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "./api";
import { useAuth } from "./useAuth";
type RecordInfo = {
  id: number;
  label: string;
  sort_order: number | null;
  description?: string | null;
  revision: string;
  is_active?: boolean | null;
};
type Preview = {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  changes: Record<string, unknown>;
  reason: string;
  preview_token: string;
};
export function CatalogEditor({
  kind,
  item,
  onClose,
  onSaved,
}: {
  kind: "vehicles" | "luggage";
  item: RecordInfo;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState<Preview | null>(null),
    [draft, setDraft] = useState({
      is_active: item.is_active ?? null,
      label: item.label,
      sort_order: item.sort_order ?? 0,
      description: item.description || "",
      reason: "",
    });
  useCatalogBusy(busy);
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || pending.current) return;
    const values = new FormData(event.currentTarget);
    const next = {
      is_active: values.get("is_active") === "active",
      label: String(values.get("label")),
      sort_order: Number(values.get("sort_order")),
      description: String(values.get("description") || ""),
      reason: String(values.get("reason")),
    };
    setDraft(next);
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      setPreview(
        await api<Preview>(`/catalog/${kind}/${item.id}/preview`, {
          method: "POST",
          csrf: session.csrf_token,
          body: {
            revision: item.revision,
            reason: next.reason,
            changes: {
              label: next.label,
              sort_order: next.sort_order,
              ...(kind === "luggage"
                ? { description: next.description, is_active: next.is_active }
                : {}),
            },
          },
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not preview changes.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function save() {
    if (!session || !preview || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await api(`/catalog/${kind}/${item.id}/apply`, {
        method: "POST",
        csrf: session.csrf_token,
        body: { preview_token: preview.preview_token },
      });
      onSaved();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Save could not be confirmed. Refresh the catalog before retrying.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const input = "mt-2 block w-full rounded-lg border bg-white px-3 py-2";
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">Edit catalog · {item.label}</h2>
        <p className="text-sm text-slate-600">
          These display changes can appear wherever Gilo reads this catalog.
          Keys, passenger capacity, vehicle status and pricing cannot be changed
          here.
        </p>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">
            {error}
          </p>
        )}
        {preview ? (
          <div className="space-y-4">
            <h3 className="font-semibold">Review changes</h3>
            {"is_active" in preview.changes && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                Availability applies to new selections. Existing requests and
                bookings retain their recorded luggage; restarting a search
                requires an available option. No rides are cancelled or refunded
                by this change.
              </p>
            )}
            <dl className="space-y-3">
              {Object.keys(preview.changes).map((key) => (
                <div key={key} className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-sm font-medium">
                    {{
                      label: "Label",
                      sort_order: "Display order",
                      description: "Description",
                      is_active: "Availability",
                    }[key] || key}
                  </dt>
                  <dd className="mt-1 break-words text-sm">
                    {key === "is_active"
                      ? preview.before[key]
                        ? "Active"
                        : "Inactive"
                      : String(preview.before[key] ?? "Empty")}{" "}
                    →{" "}
                    {key === "is_active"
                      ? preview.after[key]
                        ? "Active"
                        : "Inactive"
                      : String(preview.after[key] ?? "Empty")}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-sm">Reason: {preview.reason}</p>
            <p className="text-xs text-slate-500">
              Preview valid for five minutes. A concurrent change requires a
              fresh review.
            </p>
            <div className="flex gap-3">
              <Button disabled={busy} onClick={() => void save()}>
                {busy ? "Saving…" : "Confirm changes"}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setPreview(null)}
              >
                Back to edit
              </Button>
              <Button variant="ghost" disabled={busy} onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              Label
              <Input
                className={input}
                name="label"
                defaultValue={draft.label}
                minLength={2}
                maxLength={kind === "vehicles" ? 100 : 50}
                required
                disabled={busy}
              />
            </label>
            <label className="text-sm">
              Display order
              <Input
                className={input}
                name="sort_order"
                type="number"
                min={0}
                max={10000}
                step={1}
                defaultValue={draft.sort_order}
                required
                disabled={busy}
              />
            </label>
            {kind === "luggage" && (
              <label className="text-sm sm:col-span-2">
                Description
                <Textarea
                  className={input}
                  name="description"
                  maxLength={255}
                  defaultValue={draft.description}
                  disabled={busy}
                />
              </label>
            )}
            {kind === "luggage" && (
              <div className="sm:col-span-2">
                <label className="text-sm">
                  Availability
                  <NativeSelect
                    name="is_active"
                    className={input}
                    required
                    defaultValue={
                      draft.is_active === null
                        ? ""
                        : draft.is_active
                          ? "active"
                          : "inactive"
                    }
                    disabled={busy}
                  >
                    <option value="" disabled>
                      Choose availability
                    </option>
                    <option value="active">
                      Active · available for new selections
                    </option>
                    <option value="inactive">
                      Inactive · hidden from new selections
                    </option>
                  </NativeSelect>
                </label>
                <p className="mt-2 text-sm text-slate-600">
                  Existing requests and bookings retain their recorded luggage.
                  Restarting a search requires an available option. This does
                  not cancel or refund any ride.
                </p>
              </div>
            )}
            <label className="text-sm sm:col-span-2">
              Reason for change
              <Textarea
                className={input}
                name="reason"
                minLength={5}
                maxLength={500}
                defaultValue={draft.reason}
                required
                disabled={busy}
              />
            </label>
            <div className="flex gap-3 sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Preparing preview…" : "Review changes"}
              </Button>
              <Button variant="outline" disabled={busy} onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
