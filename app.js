
// Lógica de Parking Compartido: calendario, reservas y Firebase.

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/*
 CONFIGURACIÓN:
 1. Crea un proyecto en Firebase Console.
 2. Registra una aplicación web.
 3. Copia su configuración en firebaseConfig.
 4. Activa Authentication > Anonymous.
 5. Crea una base de datos Firestore.
*/

const firebaseConfig = {
  apiKey: "PEGA_AQUI_TU_API_KEY",
  authDomain: "PEGA_AQUI_TU_PROYECTO.firebaseapp.com",
  projectId: "PEGA_AQUI_TU_PROJECT_ID",
  appId: "PEGA_AQUI_TU_APP_ID"
};

const $ = id => document.getElementById(id);

const statusEl = $("status");

let db;
let auth;
let uid = null;
let reservations = {};
let selectedDate = null;
let month = new Date();
let profile = {
  person: "Usuario 1",
  car: ""
};

month = new Date(month.getFullYear(), month.getMonth(), 1);

const pad = n => String(n).padStart(2, "0");

const dateKey = d =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseKey = k => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const pretty = k =>
  new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(parseKey(k));

const escapeHTML = s =>
  String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

function setStatus(msg, type = "") {
  statusEl.textContent = msg;
  statusEl.className = "status " + type;
}

function loadProfile() {
  profile.person = $("person").value;
  profile.car = $("car").value.trim();
}

$("saveProfile").addEventListener("click", () => {
  loadProfile();
  setStatus("Datos del usuario preparados para las próximas reservas.", "ok");
  render();
});

$("person").addEventListener("change", () => {
  loadProfile();
  render();
});

$("car").addEventListener("change", loadProfile);


// Dibuja el calendario mensual.
function renderCalendar() {
  const cal = $("calendar");
  cal.innerHTML = "";

  $("monthTitle").textContent =
    new Intl.DateTimeFormat("es-ES", {
      month: "long",
      year: "numeric"
    }).format(month);

  ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    .forEach(w => {
      const el = document.createElement("div");
      el.className = "weekday";
      el.textContent = w;
      cal.append(el);
    });

  const firstDay = (month.getDay() + 6) % 7;
  const days = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  ).getDate();

  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement("div");
    el.className = "day empty";
    cal.append(el);
  }

  const today = dateKey(new Date());

  for (let d = 1; d <= days; d++) {
    const key = dateKey(
      new Date(month.getFullYear(), month.getMonth(), d)
    );

    const r = reservations[key];
    const btn = document.createElement("button");

    btn.className = "day"
      + (key === today ? " today" : "")
      + (key === selectedDate ? " selected" : "");

    btn.innerHTML = `<span class="daynum">${d}</span>`;

    if (r) {
      const mine = r.uid === uid;

      btn.innerHTML += `
        <span class="pill ${mine ? "mine" : "other"}">
          ${mine ? "Tú" : "Ocupado"} · ${escapeHTML(r.person || "Usuario")}
        </span>
        <span class="muted" style="font-size:.68rem">
          ${escapeHTML(r.car || "Coche sin indicar")}
        </span>`;
    } else {
      btn.innerHTML += '<span class="pill free">Libre</span>';
    }

    btn.addEventListener("click", () => {
      selectedDate = key;
      render();
    });

    cal.append(btn);
  }
}


// Muestra las próximas reservas.
function renderUpcoming() {
  const host = $("upcoming");
  const today = dateKey(new Date());

  const items = Object.entries(reservations)
    .filter(([key]) => key >= today)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 12);

  if (!items.length) {
    host.innerHTML =
      '<p class="muted">Todavía no hay reservas futuras.</p>';
    return;
  }

  host.innerHTML = items.map(([key, r]) => `
    <div class="reservation">
      <div>
        <strong>${escapeHTML(pretty(key))}</strong>
        <small>
          ${escapeHTML(r.person || "Usuario")} ·
          ${escapeHTML(r.car || "Coche sin indicar")}
        </small>
      </div>
      <span class="pill ${r.uid === uid ? "mine" : "other"}">
        ${r.uid === uid ? "Tu reserva" : "Ocupado"}
      </span>
    </div>
  `).join("");
}


// Activa o desactiva los botones según la reserva.
function renderActions() {
  const r = selectedDate ? reservations[selectedDate] : null;

  $("selectedLabel").textContent = selectedDate
    ? pretty(selectedDate)
    : "Selecciona un día en el calendario.";

  $("reserve").disabled =
    !uid || !selectedDate || !!r || selectedDate < dateKey(new Date());

  $("cancel").disabled =
    !uid || !selectedDate || !r || r.uid !== uid;
}

function render() {
  renderCalendar();
  renderUpcoming();
  renderActions();
}


// Navegación entre meses.
$("prev").addEventListener("click", () => {
  month = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  renderCalendar();
});

$("next").addEventListener("click", () => {
  month = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  renderCalendar();
});


// Crear una reserva. La transacción evita reservar un día ocupado.
$("reserve").addEventListener("click", async () => {
  if (!uid || !selectedDate) return;

  loadProfile();

  if (!profile.person) {
    setStatus("Selecciona tu usuario.", "error");
    return;
  }

  const key = selectedDate;

  try {
    await runTransaction(db, async tx => {
      const ref = doc(db, "parkingReservations", key);
      const snap = await tx.get(ref);

      if (snap.exists()) {
        throw new Error(
          "Ese día acaba de ser reservado. Elige otro."
        );
      }

      tx.set(ref, {
        date: key,
        uid,
        person: profile.person,
        car: profile.car,
        createdAt: serverTimestamp()
      });
    });

    setStatus("Reserva guardada y compartida correctamente.", "ok");

  } catch (e) {
    setStatus(
      e.message || "No se ha podido guardar la reserva.",
      "error"
    );
  }
});


// Cancelar solo la reserva propia.
$("cancel").addEventListener("click", async () => {
  if (!uid || !selectedDate) return;

  const key = selectedDate;

  try {
    await runTransaction(db, async tx => {
      const ref = doc(db, "parkingReservations", key);
      const snap = await tx.get(ref);

      if (!snap.exists()) {
        throw new Error("La reserva ya no existe.");
      }

      if (snap.data().uid !== uid) {
        throw new Error(
          "Solo quien hizo la reserva puede cancelarla."
        );
      }

      tx.delete(ref);
    });

    setStatus("Reserva cancelada.", "ok");

  } catch (e) {
    setStatus(
      e.message || "No se ha podido cancelar la reserva.",
      "error"
    );
  }
});


// Conexión y sincronización con Firebase.
async function start() {
  if (
    firebaseConfig.apiKey.startsWith("PEGA_AQUI") ||
    firebaseConfig.projectId.startsWith("PEGA_AQUI")
  ) {
    $("connection").textContent = "Falta configurar Firebase";

    setStatus(
      "Falta conectar Firebase para guardar y compartir reservas.",
      "error"
    );

    render();
    return;
  }

  try {
    const app = initializeApp(firebaseConfig);

    auth = getAuth(app);
    db = getFirestore(app);

    await signInAnonymously(auth);

    onAuthStateChanged(auth, user => {
      if (!user) return;

      uid = user.uid;
      $("connection").textContent = "● Sincronización activa";

      onSnapshot(
        collection(db, "parkingReservations"),
        snap => {
          reservations = {};

          snap.forEach(d => {
            reservations[d.id] = d.data();
          });

          render();

          setStatus(
            "Calendario sincronizado. Los cambios se muestran automáticamente.",
            "ok"
          );
        },
        err => {
          setStatus("Error leyendo reservas: " + err.message, "error");
        }
      );
    });

  } catch (e) {
    $("connection").textContent = "Sin conexión";

    setStatus(
      "No se pudo conectar con Firebase: " + e.message,
      "error"
    );
  }
}

render();
start();
