"use client";
import { useState, useTransition } from "react";
import { createStaffAction, setRoleAction } from "@/app/admin/(panel)/otros-actions";
import { adminBtn } from "./ui";

interface U { id: string; email: string | null; full_name: string; role: string; created_at: string }

export function UsersManager({ users, meId }: { users: U[]; meId: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [n, setN] = useState({ email: "", full_name: "", password: "", role: "editor" });
  const [pending, start] = useTransition();
  return (
    <div className="space-y-8">
      <ul className="divide-y divide-line">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div><p className="font-medium">{u.full_name || u.email}</p><p className="text-xs text-ink-muted">{u.email}{u.id === meId ? " · tú" : ""}</p></div>
            <select aria-label={`Rol de ${u.email}`} className="field !min-h-10 !w-44" defaultValue={u.role} disabled={pending} onChange={(e) => {
              const role = e.target.value;
              start(async () => { const r = await setRoleAction({ id: u.id, role }); setMsg(r.ok ? { ok: true, text: "Rol actualizado." } : { ok: false, text: r.error ?? "Error" }); });
            }}>
              <option value="admin">Administrador</option>
              <option value="editor">Editor</option>
              <option value="customer">Cliente</option>
            </select>
          </li>
        ))}
      </ul>
      {msg ? <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-rose-700"}`} role="status">{msg.text}</p> : null}
      <form className="grid gap-4 border-t border-line pt-6 sm:grid-cols-2" onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createStaffAction(n);
          setMsg(r.ok ? { ok: true, text: "Usuario creado. Comparte la contraseña por un canal seguro y pide cambiarla." } : { ok: false, text: r.error ?? "Error" });
          if (r.ok) setN({ email: "", full_name: "", password: "", role: "editor" });
        });
      }}>
        <p className="font-semibold sm:col-span-2">Agregar miembro del equipo</p>
        <label><span className="field-label">Nombre</span><input className="field" value={n.full_name} onChange={(e) => setN({ ...n, full_name: e.target.value })} required /></label>
        <label><span className="field-label">Correo</span><input type="email" className="field" value={n.email} onChange={(e) => setN({ ...n, email: e.target.value })} required /></label>
        <label><span className="field-label">Contraseña temporal (mín. 12)</span><input type="password" autoComplete="new-password" className="field" value={n.password} onChange={(e) => setN({ ...n, password: e.target.value })} required minLength={12} /></label>
        <label><span className="field-label">Rol</span><select className="field" value={n.role} onChange={(e) => setN({ ...n, role: e.target.value })}><option value="editor">Editor</option><option value="admin">Administrador</option></select></label>
        <div className="sm:col-span-2"><button className={adminBtn} disabled={pending}>Crear usuario</button></div>
      </form>
    </div>
  );
}
