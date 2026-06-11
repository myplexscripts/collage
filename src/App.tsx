import { useEffect } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { SetupScreen } from "./components/SetupScreen";
import { Studio } from "./components/Studio";
import { useStore } from "./store";

export default function App() {
  const phase = useStore((s) => s.phase);
  const boot = useStore((s) => s.boot);

  useEffect(() => {
    boot();
  }, [boot]);

  if (phase === "boot") {
    return (
      <div className="boot-screen">
        <span className="spinner big" />
      </div>
    );
  }
  if (phase === "login") return <LoginScreen />;
  if (phase === "setup") return <SetupScreen />;
  return <Studio />;
}
