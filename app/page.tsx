"use client";

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

export default function Home() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (!session) return <Auth />;

  return <Dashboard user={session.user} />;
}

function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      alert("Error (Crear cuenta): " + error.message);
      return;
    }

    // Si tu proyecto requiere confirmar email, data.session puede venir null
    if (!data.session) {
      alert("Cuenta creada. Revisá tu email (spam también) para confirmar y después entrá.");
    } else {
      alert("Cuenta creada y logueada!");
    }
  };

  const signIn = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      alert
      alert("Error (Entrar): " + error.message);
      return;
    }

    alert("Entraste! " + (data.user?.email ?? ""));
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Teto Chat</h1>

      <div style={{ display: "grid", gap: 8, maxWidth: 320 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={signUp} disabled={loading}>
          {loading ? "Cargando..." : "Crear cuenta"}
        </button>

        <button onClick={signIn} disabled={loading}>
          {loading ? "Cargando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}


function Dashboard({ user }: { user: any }) {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [myRoom, setMyRoom] = useState("");

  const saveProfile = async () => {
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username,
    });
    if (error) alert(error.message);
    else alert("Perfil guardado");
  };

  const createRoom = async () => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    const { error } = await supabase.from("rooms").insert({ code, owner: user.id });
    if (error) alert(error.message);
    else setMyRoom(code);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Panel</h2>

      <div style={{ display: "grid", gap: 8, maxWidth: 320 }}>
        <input
          placeholder="Tu nombre"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <button onClick={saveProfile}>Guardar perfil</button>
      </div>

      <hr style={{ margin: "20px 0" }} />

      <div style={{ display: "grid", gap: 8, maxWidth: 320 }}>
        <button onClick={createRoom}>Crear sala</button>

        {myRoom && (
          <div>
            Tu sala: <b>{myRoom}</b> — <a href={`/room/${myRoom}`}>Entrar</a>
          </div>
        )}

        <input
          placeholder="Código para unirme (ej: ABC12)"
          value={roomCode}
          onChange={e => setRoomCode(e.target.value.toUpperCase())}
        />
        <button onClick={() => (window.location.href = `/room/${roomCode}`)}>
          Unirme
        </button>
      </div>

      <hr style={{ margin: "20px 0" }} />

      <button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
    </div>
  );
}
