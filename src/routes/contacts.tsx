import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Star, ContactRound } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { displayNumber, digitsOnly, formatFaxNumber } from "@/lib/format";
import { FREE_CONTACT_CAP, owns } from "@/lib/catalog";
import { BuySheet } from "@/components/paywall";
import { useFaxStore } from "@/lib/store";
import type { Contact } from "@/lib/types";
import { Users } from "lucide-react";

export const Route = createFileRoute("/contacts")({ component: ContactsPage });

function ContactsPage() {
  const navigate = useNavigate();
  const contacts = useFaxStore((s) => s.contacts);
  const addContact = useFaxStore((s) => s.addContact);
  const updateContact = useFaxStore((s) => s.updateContact);
  const deleteContact = useFaxStore((s) => s.deleteContact);
  const setDraft = useFaxStore((s) => s.setDraft);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [query, setQuery] = useState("");
  const [buy, setBuy] = useState(false);
  const entitlements = useFaxStore((s) => s.entitlements);
  const pro = owns(entitlements, "directory");

  const filtered = contacts
    .filter((c) => {
      const q = query.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.fax.includes(query.replace(/\D/g, ""))
      );
    })
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.company.localeCompare(b.company));

  async function importContacts() {
    if (!pro && contacts.length >= FREE_CONTACT_CAP) {
      setBuy(true);
      return;
    }
    const picker = (
      navigator as Navigator & {
        contacts?: {
          select: (
            props: string[],
            opts?: { multiple?: boolean },
          ) => Promise<Array<{ name?: string[]; tel?: string[]; organization?: string[] }>>;
        };
      }
    ).contacts;
    if (!picker) {
      toast.error("This phone does not expose a contact picker.");
      return;
    }
    try {
      const picked = await picker.select(["name", "tel", "organization"], { multiple: true });
      let added = 0;
      for (const row of picked) {
        const tel = row.tel?.[0] ?? "";
        const fax = digitsOnly(tel);
        if (fax.length < 10) continue;
        addContact({
          name: row.name?.[0] ?? "",
          company: row.organization?.[0] ?? row.name?.[0] ?? "Imported",
          fax,
          phone: fax,
          favorite: false,
          notes: "Imported from phone",
        });
        added += 1;
      }
      toast.success(added ? `${added} station${added === 1 ? "" : "s"} imported.` : "No fax-capable numbers in that selection.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Could not read contacts.");
    }
  }

  return (
    <main className="flex flex-1 flex-col pb-8">
      <PageHeader
        kicker="Speed dial"
        title="Directory"
        action={
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              aria-label="Import from phone"
              onClick={() => void importContacts()}
            >
              <ContactRound />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="Add contact"
              onClick={() => {
                if (!pro && contacts.length >= FREE_CONTACT_CAP) {
                  setBuy(true);
                  return;
                }
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus />
            </Button>
          </div>
        }
      />
      <div className="px-5">
        <Input placeholder="Search firms or numbers" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No stations stored" body="Save the fax numbers you send to often and assign them to speed dial 1–8." />
      ) : (
        <ul className="mt-2 px-2">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-bg-subtle"
                onClick={() => {
                  setDraft({ toNumber: c.fax, toName: c.company || c.name });
                  void navigate({ to: "/compose" });
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setEditing(c);
                  setOpen(true);
                }}
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-bg-subtle font-mono text-xs text-lcd">
                  {c.speedDial ?? (c.company[0] || c.name[0])}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-medium">
                    {c.company || c.name}
                    {c.favorite && <Star className="size-3 fill-lcd text-lcd" />}
                  </p>
                  <p className="truncate text-sm text-fg-muted">{c.name}</p>
                  <p className="font-mono text-xs text-fg-subtle">{displayNumber(c.fax)}</p>
                </div>
                <span className="text-xs text-fg-subtle">Fax</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="px-5 pt-2 text-xs text-fg-subtle">Tap to send. Press and hold to edit.</p>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? "Edit station" : "New station"}</SheetTitle>
          </SheetHeader>
          <ContactForm
            initial={editing}
            onSave={(data) => {
              if (editing) updateContact(editing.id, data);
              else addContact({ ...data, favorite: true });
              setOpen(false);
              toast.success("Directory updated.");
            }}
            onDelete={
              editing
                ? () => {
                    deleteContact(editing.id);
                    setOpen(false);
                  }
                : undefined
            }
          />
        </SheetContent>
      </Sheet>
      <BuySheet sku="directory" open={buy} onOpenChange={setBuy} />
    </main>
  );
}

function ContactForm({
  initial,
  onSave,
  onDelete,
}: {
  initial: Contact | null;
  onSave: (c: Omit<Contact, "id">) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [fax, setFax] = useState(initial?.fax ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [speedDial, setSpeedDial] = useState(initial?.speedDial ? String(initial.speedDial) : "");
  const [favorite, setFavorite] = useState(initial?.favorite ?? true);

  return (
    <form
      className="flex flex-col gap-3 overflow-y-auto px-5 pb-8"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          name,
          company,
          fax,
          phone,
          notes,
          favorite,
          speedDial: speedDial ? Number(speedDial) : undefined,
        });
      }}
    >
      <Field label="Firm" value={company} onChange={setCompany} />
      <Field label="Contact" value={name} onChange={setName} />
      <div className="space-y-2">
        <Label>Fax</Label>
        <Input required inputMode="tel" value={formatFaxNumber(fax)} onChange={(e) => setFax(e.target.value)} className="font-mono" />
      </div>
      <div className="space-y-2">
        <Label>Voice</Label>
        <Input inputMode="tel" value={formatFaxNumber(phone)} onChange={(e) => setPhone(e.target.value)} className="font-mono" />
      </div>
      <div className="space-y-2">
        <Label>Speed dial (1–8)</Label>
        <Input inputMode="numeric" value={speedDial} onChange={(e) => setSpeedDial(e.target.value.replace(/\D/g, "").slice(0, 1))} />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <label className="flex items-center justify-between py-1 text-sm">
        Favorite
        <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} className="size-4" />
      </label>
      <Button type="submit" variant="start" className="mt-2">
        Save
      </Button>
      {onDelete && (
        <Button type="button" variant="ghost" className="text-danger" onClick={onDelete}>
          Delete
        </Button>
      )}
    </form>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
