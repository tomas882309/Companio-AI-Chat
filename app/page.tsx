"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Profile
  const [username, setUsername] = useState("");

  // Rooms
  const [joinCode, setJoinCode] = useState("");

  // styles (match chat grey)
  const bg = "#2f2f2f";
  const panel = "#3a3a3a";
  const text = "#f2f2f2";
  const muted = "rgba(255,255,255,0.65)";
  const border = "1px solid rgba(255,255,255,0.08)";

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const authCardStyle = useMemo(
    () => ({
      width: "100%",
      maxWidth: 460,
      background: panel,
      border,
      borderRadius: 18,
      padding: 22,
      boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
    }),
    []
  );

  const inputStyle = useMemo(
    () => ({
      width: "100%",
      padding: "12px 12px",
      borderRadius: 12,
      border,
      background: "rgba(0,0,0,0.25)",
      color: text,
      outline: "none",
      fontSize: 15,
    }),
    []
  );

  const buttonStyle = useMemo(
    () => ({
      width: "100%",
      padding: "12px 12px",
      borderRadius: 12,
      border,
      background: "rgba(255,255,255,0.08)",
      color: text,
      fontWeight: 600 as const,
      cursor: "pointer",
    }),
    []
  );

  const buttonRowStyle = useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginTop: 10,
    }),
    []
  );

  async function signUp() {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      alert("Account created! Now log in.");
    } catch (e: any) {
      alert(`Error (Sign up): ${e?.message ?? "Unknown error"}`);
    }
  }

  async function signIn() {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e: any) {
      alert(`Error (Login): ${e?.message ?? "Unknown error"}`);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function saveProfile() {
    if (!session?.user?.id) return;

    const u = session.user;

    // Example: set Maddy avatar automatically
    const maddyEmail = "maddy_companioai@gmail.com";
    const avatar =
      (u.email || "").toLowerCase() === maddyEmail ? "/maddy.png" : "/avatar.png";

    const res = await supabase.from("profiles").upsert({
      id: u.id,
      username: username || "Anonymous",
      avatar_url: avatar,
    });

    if (res.error) {
      alert(`Profile error: ${res.error.message}`);
      return;
    }

    alert("Profile saved!");
  }

  async function createRoom() {
    // create random 5-letter code
    const code = Math.random().toString(36).slice(2, 7).toUpperCase();

    const { data, error } = await supabase
      .from("rooms")
      .insert({ code })
      .select()
      .single();

    if (error) {
      alert(`Create room error: ${error.message}`);
      return;
    }

    router.push(`/room/${data.code}`);
  }

  function joinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    router.push(`/room/${code}`);
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: bg,
          color: text,
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        color: text,
        display: "grid",
        placeItems: "center",
        padding: 18,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div style={authCardStyle}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 0.2 }}>
            Companio AI
          </div>
          <div style={{ fontSize: 14, color: muted, marginTop: 6 }}>
            Simple realtime chat rooms
          </div>
        </div>

        {!session ? (
          <>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>Email</div>
                <input
                  style={inputStyle}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>
                  Password
                </div>
                <input
                  style={inputStyle}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div style={buttonRowStyle}>
              <button style={buttonStyle} onClick={signUp}>
                Create account
              </button>
              <button style={buttonStyle} onClick={signIn}>
                Log in
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              {/* Profile */}
              <div
                style={{
                  background: "rgba(0,0,0,0.18)",
                  border,
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Profile</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>
                      Display name
                    </div>
                    <input
                      style={inputStyle}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <button style={buttonStyle} onClick={saveProfile}>
                    Save profile
                  </button>
                </div>
              </div>

              {/* Rooms */}
              <div
                style={{
                  background: "rgba(0,0,0,0.18)",
                  border,
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Rooms</div>

                <div style={{ display: "grid", gap: 10 }}>
                  <button style={buttonStyle} onClick={createRoom}>
                    Create room
                  </button>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                    <input
                      style={inputStyle}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Room code (e.g. ABC12)"
                    />
                    <button
                      style={{
                        ...buttonStyle,
                        width: "auto",
                        padding: "12px 16px",
                        whiteSpace: "nowrap",
                      }}
                      onClick={joinRoom}
                    >
                      Join
                    </button>
                  </div>
                </div>
              </div>

              {/* Sign out */}
              <button
                style={{
                  ...buttonStyle,
                  background: "rgba(255,255,255,0.06)",
                }}
                onClick={signOut}
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
