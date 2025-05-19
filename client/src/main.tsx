import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Firebase initialization is now in lib/firebase.ts

createRoot(document.getElementById("root")!).render(<App />);
