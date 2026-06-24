import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Search, Loader2, X, Star, Upload } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { labelizeCategory, useCategories } from "@/lib/categories";
import { fileToBase64 } from "@/lib/image";
import AdminLayout from "@/components/AdminLayout";
import { formatNaira, STYLE_OPTIONS } from "./shared";

let sizeRowSeq = 0;
const nextSizeId = () => `sz_${sizeRowSeq++}`;

type SizeRow = { id: string; size: string; qty: string };
type FormState = {
  name: string; description: string; category: string; team: string;
  price: string; originalPrice: string; images: string[]; color: string;
  material: string; style: string; tags: string; stock: string;
  featured: boolean; sizes: SizeRow[];
};

const EMPTY_FORM: FormState = {
  name: "", description: "", category: "", team: "",
  price: "", originalPrice: "", images: [], color: "", material: "",
  style: "", tags: "", stock: "", featured: false, sizes: [],
};

function productToForm(p: any): FormState {
  const sizesObj = (p.sizes && typeof p.sizes === "object") ? p.sizes : {};
  const sizes: SizeRow[] = Object.entries(sizesObj).map(([size, qty]) => ({ id: nextSizeId(), size, qty: String(qty) }));
  // gallery = primary imageUrl first, then any extra imageUrls, de-duplicated
  const extra = Array.isArray(p.imageUrls) ? p.imageUrls : [];
  const images = Array.from(new Set([p.imageUrl, ...extra].filter(Boolean)));
  return {
    name: p.name ?? "",
    description: p.description ?? "",
    category: p.category ?? "",
    team: p.team ?? "",
    price: p.price != null ? String(Number(p.price)) : "",
    originalPrice: p.originalPrice != null ? String(Number(p.originalPrice)) : "",
    images,
    color: p.color ?? "",
    material: p.material ?? "",
    style: p.style ?? "",
    tags: Array.isArray(p.tags) ? p.tags.join(", ") : "",
    stock: p.stock != null ? String(p.stock) : "",
    featured: Boolean(p.featured),
    sizes,
  };
}

export default function AdminProducts() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.admin.products.list.useQuery(undefined, { enabled: isAdmin });

  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState<any | null>(null); // product being edited (or {} sentinel for new)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const { categories } = useCategories();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = (products as any[]) || [];
    if (activeCat) list = list.filter(p => p.category === activeCat);
    if (q) list = list.filter(p => `${p.name} ${p.category} ${p.team || ""} ${p.color || ""}`.toLowerCase().includes(q));
    return list;
  }, [products, query, activeCat]);

  const invalidate = () => Promise.all([
    utils.admin.products.list.invalidate(),
    utils.admin.stats.invalidate(),
    utils.products.list.invalidate(),
    utils.products.featured.invalidate(),
    utils.products.getById.invalidate(), // refresh open product detail pages
    utils.products.search.invalidate(),
  ]);

  const del = trpc.admin.products.delete.useMutation({
    onSuccess: async () => { await invalidate(); toast.success("Product deleted"); setDeleteTarget(null); },
    onError: e => toast.error(e.message || "Could not delete"),
  });

  return (
    <AdminLayout
      title="Products"
      description={products ? `${products.length} in catalog` : "Manage your catalog"}
      actions={
        <button onClick={() => setEditing({})} className="btn btn-primary !py-2.5">
          <Plus className="w-4 h-4" /> New product
        </button>
      }
    >
      {/* search */}
      <div className="relative max-w-sm mb-4">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products…" className="field !pl-10 !py-2.5" />
      </div>

      {/* category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-5 border-b border-ink/10">
        <CatTab active={!activeCat} onClick={() => setActiveCat(undefined)}>All <span className="opacity-50">{products?.length ?? 0}</span></CatTab>
        {categories.map(c => (
          <CatTab key={c.value} active={activeCat === c.value} onClick={() => setActiveCat(c.value)}>
            {c.label} <span className="opacity-50">{c.count}</span>
          </CatTab>
        ))}
      </div>

      {isLoading ? (
        <div className="py-24 flex items-center justify-center gap-3 tech-label"><Loader2 className="w-5 h-5 animate-spin" /> Loading products…</div>
      ) : filtered.length === 0 ? (
        <div className="border border-ink/15 p-10 text-center text-muted-foreground font-medium">
          {query || activeCat ? "No products match these filters." : "No products yet. Create your first one."}
        </div>
      ) : (
        <div className="border border-ink/15 bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-ink/15 text-left">
                <Th>Product</Th>
                <Th>Category</Th>
                <Th className="text-right">Price</Th>
                <Th className="text-right">Stock</Th>
                <Th className="text-center">Featured</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-secondary/60 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={p.imageUrl} alt={p.name} className="w-11 h-11 object-cover bg-secondary border border-border shrink-0" loading="lazy" />
                      <div className="min-w-0">
                        <div className="font-bold truncate max-w-[260px]">{p.name}</div>
                        <div className="tech-label mt-0.5 normal-case tracking-normal font-medium">{[p.color, p.team].filter(Boolean).join(" · ") || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap">{labelizeCategory(p.category)}</td>
                  <td className="p-3 text-right font-bold mono whitespace-nowrap">{formatNaira(p.price)}</td>
                  <td className={`p-3 text-right font-bold mono ${(p.stock ?? 0) === 0 ? "text-destructive" : (p.stock ?? 0) <= 10 ? "text-signal" : ""}`}>{p.stock ?? 0}</td>
                  <td className="p-3 text-center">{p.featured ? <Star className="w-4 h-4 inline fill-signal text-signal" /> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditing(p)} aria-label="Edit" className="w-8 h-8 grid place-items-center hover:text-signal transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget(p)} aria-label="Delete" className="w-8 h-8 grid place-items-center hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductModal
          product={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={async () => { await invalidate(); setEditing(null); }}
        />
      )}

      {deleteTarget && (
        <Modal title="Delete product" onClose={() => setDeleteTarget(null)}>
          <p className="text-muted-foreground font-medium">
            Delete <span className="font-bold text-ink">{deleteTarget.name}</span>? This removes it from the catalog and any carts. This can't be undone.
          </p>
          <div className="flex gap-2 mt-6">
            <button onClick={() => del.mutate({ id: deleteTarget.id })} disabled={del.isPending} className="btn btn-destructive">
              {del.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
            </button>
            <button onClick={() => setDeleteTarget(null)} className="btn btn-outline !py-2.5">Cancel</button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th scope="col" className={`p-3 tech-label font-bold ${className}`}>{children}</th>;
}

function CatTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-4 py-2 text-[12px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${active ? "bg-ink text-paper" : "hover:text-signal"}`}
    >
      {children}
    </button>
  );
}

// ---- Create / edit modal -----------------------------------------------------
function ProductModal({ product, onClose, onSaved }: { product: any | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(product ? productToForm(product) : EMPTY_FORM);
  const isEdit = Boolean(product);
  const { categories } = useCategories();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0); // count of in-flight uploads
  const [urlDraft, setUrlDraft] = useState("");

  const upload = trpc.admin.products.uploadImage.useMutation();

  const addImages = (urls: string[]) =>
    setForm(p => ({ ...p, images: Array.from(new Set([...p.images, ...urls])) }));
  const removeImage = (url: string) => setForm(p => ({ ...p, images: p.images.filter(u => u !== url) }));
  const makePrimary = (url: string) =>
    setForm(p => ({ ...p, images: [url, ...p.images.filter(u => u !== url)] }));

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    const picked = Array.from(files);
    setUploading(n => n + picked.length);
    for (const file of picked) {
      try {
        if (!ALLOWED.includes(file.type.toLowerCase())) {
          toast.error(`${file.name}: unsupported type (use JPG, PNG, GIF or WEBP)`);
          continue;
        }
        const { b64Json, mimeType } = await fileToBase64(file);
        const { url } = await upload.mutateAsync({ b64Json, mimeType, filename: file.name });
        addImages([url]);
      } catch (err: any) {
        toast.error(err?.message || `Could not upload ${file.name}`);
      } finally {
        setUploading(n => Math.max(0, n - 1));
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const create = trpc.admin.products.create.useMutation({
    onSuccess: () => { toast.success("Product created"); onSaved(); },
    onError: e => toast.error(e.message || "Could not create product"),
  });
  const update = trpc.admin.products.update.useMutation({
    onSuccess: () => { toast.success("Product updated"); onSaved(); },
    onError: e => toast.error(e.message || "Could not update product"),
  });
  const pending = create.isPending || update.isPending;

  const set = <K extends keyof FormState>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const setSize = (id: string, key: keyof SizeRow, val: string) =>
    setForm(p => ({ ...p, sizes: p.sizes.map(r => (r.id === id ? { ...r, [key]: val } : r)) }));
  const addSize = () => setForm(p => ({ ...p, sizes: [...p.sizes, { id: nextSizeId(), size: "", qty: "" }] }));
  const removeSize = (id: string) => setForm(p => ({ ...p, sizes: p.sizes.filter(r => r.id !== id) }));

  const sizesStock = form.sizes.reduce((sum, r) => sum + (parseInt(r.qty, 10) || 0), 0);
  const hasSizes = form.sizes.some(r => r.size.trim());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(form.price);
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.category.trim()) return toast.error("Category is required");
    if (form.images.length === 0) return toast.error("Add at least one image");
    if (uploading > 0) return toast.error("Wait for images to finish uploading");
    if (!Number.isFinite(price) || price < 0) return toast.error("Enter a valid price");

    const sizesObj: Record<string, number> = {};
    for (const r of form.sizes) {
      const s = r.size.trim();
      const q = parseInt(r.qty, 10);
      if (s && Number.isFinite(q)) sizesObj[s] = q;
    }
    const stock = hasSizes ? sizesStock : (parseInt(form.stock, 10) || 0);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      // normalise to a slug so categories stay consistent (e.g. "Track Suits" -> "track_suits")
      category: form.category.trim().toLowerCase().replace(/\s+/g, "_"),
      team: form.team.trim() || undefined,
      price,
      originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
      imageUrl: form.images[0],      // first = primary (used on cards)
      imageUrls: form.images,        // full gallery
      color: form.color.trim() || undefined,
      material: form.material.trim() || undefined,
      style: form.style || undefined,
      tags: form.tags.trim() ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
      sizes: Object.keys(sizesObj).length ? sizesObj : undefined,
      stock,
      featured: form.featured,
    };

    if (isEdit) update.mutate({ id: product.id, ...payload });
    else create.mutate(payload);
  };

  return (
    <Modal title={isEdit ? "Edit product" : "New product"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name *"><input className="field" value={form.name} onChange={set("name")} required /></Field>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Category *">
            <input className="field" list="admin-category-options" value={form.category} onChange={set("category")} placeholder="club_jerseys, boots…" required />
            <datalist id="admin-category-options">
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </datalist>
            <span className="tech-label normal-case tracking-normal font-medium text-muted-foreground mt-1 block">Pick an existing one or type a new category.</span>
          </Field>
          <Field label="Team"><input className="field" value={form.team} onChange={set("team")} placeholder="Manchester United" /></Field>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Price (₦) *"><input className="field" type="number" min="0" step="0.01" value={form.price} onChange={set("price")} required /></Field>
          <Field label="Original price (₦)"><input className="field" type="number" min="0" step="0.01" value={form.originalPrice} onChange={set("originalPrice")} placeholder="Optional" /></Field>
          <Field label="Style">
            <select className="field" value={form.style} onChange={set("style")}>
              <option value="">—</option>
              {STYLE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        {/* Images — upload multiple (jpg/png/gif/webp) or add by URL */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="tech-label">Images *</label>
            <span className="tech-label normal-case tracking-normal font-medium text-muted-foreground">First image is the primary</span>
          </div>

          {/* thumbnails */}
          {form.images.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
              {form.images.map((url, i) => (
                <div key={url} className="relative group aspect-square border border-border bg-secondary overflow-hidden">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute top-1 left-1 bg-signal text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full">Primary</span>}
                  <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/50 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    {i !== 0 && (
                      <button type="button" onClick={() => makePrimary(url)} title="Make primary" className="w-7 h-7 grid place-items-center bg-paper text-ink rounded-full hover:bg-signal hover:text-white">
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button type="button" onClick={() => removeImage(url)} title="Remove" className="w-7 h-7 grid place-items-center bg-paper text-destructive rounded-full hover:bg-destructive hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {uploading > 0 && (
                <div className="aspect-square border border-dashed border-ink/20 grid place-items-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* upload dropzone */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-ink/20 hover:border-signal hover:text-signal transition-colors font-bold uppercase tracking-wide text-sm"
          >
            {uploading > 0 ? <><Loader2 className="w-5 h-5 animate-spin" /> Uploading…</> : <><Upload className="w-5 h-5" /> Upload images (JPG, PNG, GIF, WEBP)</>}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />

          {/* add by URL */}
          <div className="flex gap-2 mt-2">
            <input
              className="field !py-2"
              value={urlDraft}
              onChange={e => setUrlDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (urlDraft.trim()) { addImages([urlDraft.trim()]); setUrlDraft(""); } } }}
              placeholder="…or paste an image URL"
            />
            <button type="button" onClick={() => { if (urlDraft.trim()) { addImages([urlDraft.trim()]); setUrlDraft(""); } }} className="btn btn-outline !py-2 shrink-0">Add</button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Color"><input className="field" value={form.color} onChange={set("color")} placeholder="Red" /></Field>
          <Field label="Material"><input className="field" value={form.material} onChange={set("material")} placeholder="Polyester" /></Field>
        </div>

        <Field label="Tags (comma separated)"><input className="field" value={form.tags} onChange={set("tags")} placeholder="home, classic, retro" /></Field>

        {/* sizes / stock */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="tech-label">Sizes & stock</label>
            <button type="button" onClick={addSize} className="tech-label text-signal inline-flex items-center gap-1 hover:underline"><Plus className="w-3 h-3" /> Add size</button>
          </div>
          {form.sizes.length === 0 ? (
            <Field label="">
              <input className="field" type="number" min="0" value={form.stock} onChange={set("stock")} placeholder="Total stock (one-size item)" />
            </Field>
          ) : (
            <div className="space-y-2">
              {form.sizes.map(r => (
                <div key={r.id} className="flex gap-2 items-center">
                  <input className="field !py-2" value={r.size} onChange={e => setSize(r.id, "size", e.target.value)} placeholder="Size (S, M, 10…)" aria-label="Size label" />
                  <input className="field !py-2 max-w-[120px]" type="number" min="0" value={r.qty} onChange={e => setSize(r.id, "qty", e.target.value)} placeholder="Qty" aria-label="Size quantity" />
                  <button type="button" onClick={() => removeSize(r.id)} aria-label="Remove size" className="w-9 h-9 grid place-items-center hover:text-destructive shrink-0"><X className="w-4 h-4" /></button>
                </div>
              ))}
              <p className="tech-label">Total stock: <span className="font-bold text-ink">{sizesStock}</span> (auto)</p>
            </div>
          )}
        </div>

        <Field label="Description">
          <textarea className="field min-h-[90px] resize-y" value={form.description} onChange={set("description")} />
        </Field>

        <label className="flex items-center gap-3 border border-ink/15 p-4 cursor-pointer">
          <input type="checkbox" checked={form.featured} onChange={e => setForm(p => ({ ...p, featured: e.target.checked }))} className="w-5 h-5 accent-[var(--signal)]" />
          <span><span className="font-bold block">Featured</span><span className="tech-label normal-case tracking-normal font-medium">Show in homepage highlights</span></span>
        </label>

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={pending || uploading > 0} className="btn btn-primary">
            {pending && <Loader2 className="w-4 h-4 animate-spin" />} {isEdit ? "Save changes" : "Create product"}
          </button>
          <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

// ---- Reusable modal shell ----------------------------------------------------
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Move focus into the dialog (screen readers announce the aria-label).
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const els = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null);
      if (els.length === 0) { e.preventDefault(); return; }
      const first = els[0], last = els[els.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      else if (!panel.contains(active)) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.(); // restore focus to the trigger
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div aria-hidden="true" className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className={`relative bg-paper border border-ink w-full outline-none ${wide ? "max-w-2xl" : "max-w-md"} max-h-dvh sm:max-h-[90vh] overflow-y-auto shadow-[8px_8px_0_rgba(0,0,0,0.15)]`}>
        <div className="sticky top-0 bg-paper border-b border-ink/15 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="display text-2xl">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 grid place-items-center hover:text-signal"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// Wrapping <label> gives implicit label↔control association (no id wiring needed).
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      {label && <span className="tech-label block mb-1.5">{label}</span>}
      {children}
    </label>
  );
}
