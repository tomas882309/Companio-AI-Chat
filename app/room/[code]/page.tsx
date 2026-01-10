"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type ProfileRow = { id: string; avatar_url: string | null };
type MsgRow = {
  id: string | number;
  room_id: string | number;
  user_id: string | null;
  content: string;
  created_at?: string;
};

export default function RoomPage() {
  const params = useParams();
  const code = useMemo(() => String(params.code || "").toUpperCase(), [params.code]);

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [room, setRoom] = useState<any>(null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [text, setText] = useState("");

  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});
  const profilesRef = useRef<Record<string, ProfileRow>>({});

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Mantener ref actualizada (para evitar closures viejos)
  useEffect(() => {
    profilesRef.current = profilesById;
  }, [profilesById]);

  // Deduplicar por id por si quedó algún duplicado viejo en estado
  const uniqueMessages = useMemo(() => {
    const seen = new Set<string>();
    const out: MsgRow[] = [];
    for (const m of messages) {
      const k = String(m.id);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(m);
    }
    return out;
  }, [messages]);

  // --- cargar perfiles (avatars) para user_ids que aparezcan en mensajes ---
  const loadProfilesFor = async (ids: (string | null | undefined)[]) => {
    const clean = Array.from(new Set(ids.filter(Boolean))) as string[];
    if (clean.length === 0) return;

    const existing = profilesRef.current;
    const missing = clean.filter((id) => !existing[id]);
    if (missing.length === 0) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, avatar_url")
      .in("id", missing);

    if (error) return;

    const rows = (data ?? []) as ProfileRow[];
    setProfilesById((prev) => {
      const next = { ...prev };
      for (const p of rows) next[p.id] = p;
      return next;
    });
  };

  // 1) Saber quién soy + setear avatar especial de Maddy
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;

      setUserId(u?.id ?? null);
      setUserEmail(u?.email ?? null);

      // ✅ Avatar especial SOLO para este email
      if (u?.id && u?.email?.toLowerCase() === "maddy_companioai@gmail.com") {
        // Esto depende de RLS: normalmente permitís que cada usuario edite su propio profile.
        const res = await supabase.from("profiles").upsert({
          id: u.id,
          avatar_url: "/maddy.png",
        });

        if (res.error) {
          console.log("UPsert profiles error:", res.error);
        }
      }
    };

    run();
  }, []);

  // 2) Cargar sala + mensajes iniciales
  useEffect(() => {
    if (!code) return;

    const load = async () => {
      const { data: r, error: rErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (rErr) return alert("Error sala: " + rErr.message);
      if (!r) return alert("Sala no existe");

      setRoom(r);

      const { data: m, error: mErr } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", r.id)
        .order("created_at", { ascending: true });

      if (mErr) return alert("Error mensajes: " + mErr.message);

      const list = (m ?? []) as MsgRow[];
      setMessages(list);

      // cargar perfiles para avatars
      await loadProfilesFor(list.map((x) => x.user_id));
    };

    load();
  }, [code]);

  // 3) Realtime: escuchar inserts nuevos (sin duplicar)
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${room.id}` },
        (payload) => {
          const msg = payload.new as MsgRow;

          setMessages((prev) => {
            if (prev.some((m) => String(m.id) === String(msg.id))) return prev;
            return [...prev, msg];
          });

          // traer avatar del que envió
          loadProfilesFor([msg.user_id]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room]);

  // 4) Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [uniqueMessages.length]);

  // 5) Enviar mensaje (Enter envía / Shift+Enter nueva línea)
  // ✅ NO hacemos setMessages acá: lo agrega Realtime y no hay duplicados
  const send = async () => {
    if (!text.trim() || !room) return;

    const content = text.trim();
    setText("");

    const { error } = await supabase.from("messages").insert({
      room_id: room.id,
      user_id: userId, // para alinear derecha/izquierda
      content,
    });

    if (error) {
      alert("Error enviando: " + error.message);
      setText(content);
      return;
    }
  };

  // ---- estilos ----
  const page = {
    minHeight: "100vh",
    background: "#2f2f2f",
    color: "white",
    overflowX: "hidden" as const,
  };

  const shell = {
    maxWidth: 880,
    margin: "0 auto",
    padding: "24px 16px 120px",
  };

  const messagesBox = {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    paddingTop: 12,
  };

  const inputDock = {
    position: "fixed" as const,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(47,47,47,0.92)",
    backdropFilter: "blur(6px)",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    padding: "14px 0",
  };

  const inputRow = {
    maxWidth: 880,
    margin: "0 auto",
    padding: "0 16px",
    display: "flex",
    gap: 10,
    alignItems: "flex-end",
  };

  const composer = {
    flex: 1,
    background: "#3a3a3a",
    color: "white",
    border: "none",
    outline: "none",
    borderRadius: 14,
    padding: "12px 14px",
    fontSize: 15,
    lineHeight: "20px",
    resize: "none" as const,
    minHeight: 44,
    maxHeight: 160,
    overflowY: "auto" as const,
    whiteSpace: "pre-wrap" as const,
  };

  const sendBtn = {
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "pointer",
    height: 44,
    width: 44,
    display: "grid",
    placeItems: "center",
  };

  const iconStyle = {
    width: 22,
    height: 22,
    opacity: 0.9,
  };

  // Badge sala arriba del input
  const badge = {
    position: "fixed" as const,
    right: 18,
    bottom: 92,
    fontSize: 12,
    opacity: 0.9,
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.10)",
    padding: "6px 10px",
    borderRadius: 999,
  };

  const avatarStyle = {
    width: 28,
    height: 28,
    borderRadius: "50%",
    flex: "0 0 auto",
    opacity: 0.95,
  };

  return (
    <div style={page}>
      <div style={shell}>
        <div style={messagesBox}>
          {uniqueMessages.map((m, idx) => {
            const mine = userId && m.user_id === userId;

            const key = `${m.id}-${idx}`;

            // ✅ fila ocupa todo el ancho
            const row = {
              width: "100%",
              display: "flex",
              justifyContent: mine ? ("flex-end" as const) : ("flex-start" as const),
            };

            // ✅ grupo ocupa ancho completo, alinea adentro
            const group = {
              width: "100%",
              display: "flex",
              justifyContent: mine ? ("flex-end" as const) : ("flex-start" as const),
              alignItems: "flex-start",
              gap: 8,
              minWidth: 0,
            };

            const bubble = {
              display: "inline-block",
              maxWidth: "72%",
              background: mine ? "#4a4a4a" : "#383838",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: "7px 9px",

              // ✅ comportamiento tipo ChatGPT
              whiteSpace: "pre-wrap" as const,
              wordBreak: "normal" as const,
              overflowWrap: "break-word" as const,
              hyphens: "none" as const,

              minWidth: 90,
            };

            // ✅ avatar por usuario (Maddy usa /maddy.png si su profile lo tiene)
            const avatarSrc =
              (m.user_id ? profilesById[String(m.user_id)]?.avatar_url : null) || "/avatar.png";

            return (
              <div key={key} style={row}>
                <div style={group}>
                  {mine ? (
                    <>
                      <div style={bubble}>{m.content}</div>
                      <img src={avatarSrc} alt="avatar" style={avatarStyle} />
                    </>
                  ) : (
                    <>
                      <img src={avatarSrc} alt="avatar" style={avatarStyle} />
                      <div style={bubble}>{m.content}</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      <div style={badge}> {code}</div>

      <div style={inputDock}>
        <div style={inputRow}>
          <textarea
            style={composer}
            value={text}
            placeholder="Escribí…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />

          <button style={sendBtn} onClick={send} aria-label="Enviar">
            {/* Icono avión */}
            <svg viewBox="0 0 24 24" style={iconStyle} aria-hidden="true">
              <path fill="white" d="M2 21l20-9L2 3v7l14 2-14 2v7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
