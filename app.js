// app.js — primer “smoke test” + formulario básico
import { supabase } from "./config.js";

// Helper: evita disparar búsquedas por cada tecla (optimiza red)
function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// --- Test de conexión: contar clientes ---
async function ping() {
  const { data, count, error } = await supabase
    .from("clientes")
    .select("id", { count: "exact" }); // sin head:true

  const box = document.getElementById("status");
  if (error) {
    console.error(error);
    box.textContent = "❌ Error conectando a Supabase: " + error.message;
  } else {
    box.textContent =
      "✅ Conectado a Supabase. Clientes totales: " +
      (count ?? (data?.length || 0));
  }
}

// --- Alta de cliente rápido ---
async function crearCliente(evt) {
  evt.preventDefault();

  const nombre = document.getElementById("cli_nombre").value.trim();
  const apellido = document.getElementById("cli_apellido").value.trim();
  const dni = document.getElementById("cli_dni").value.trim();
  const telefono = document.getElementById("cli_tel").value.trim();
  const email = document.getElementById("cli_email").value.trim();

  if (!nombre || !apellido || !dni) {
    alert("Nombre, Apellido y DNI son obligatorios");
    return;
  }

  const { data, error } = await supabase
    .from("clientes")
    .insert([{ nombre, apellido, dni, telefono, email }])
    .select();

  if (error) {
    // Si el DNI es único, este código captura el error de clave duplicada (23505)
    if (error.code === "23505") {
      alert("❌ Ya existe un cliente con ese DNI.");
    } else {
      alert("❌ No se pudo crear el cliente: " + error.message);
    }
    console.error(error);
    return;
  }

  alert("✅ Cliente creado: " + data[0].apellido + ", " + data[0].nombre);
  evt.target.reset();
  listarClientes();
  cargarClientesSelect();
}

// --- Listado simple de clientes ---
async function listarClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("nombre, apellido, dni, telefono, email, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const ul = document.getElementById("lista_clientes");
  ul.innerHTML = "";

  if (error) {
    ul.innerHTML = "<li>❌ Error listando: " + error.message + "</li>";
    return;
  }

  data.forEach((c) => {
    const li = document.createElement("li");
    li.textContent = `${c.nombre} ${c.apellido ?? ""},  — DNI: ${c.dni}${
      c.telefono ? " — " + c.telefono : ""
    }${c.email ? " — " + c.email : ""}`;
    ul.appendChild(li);
  });
}

// Busca por nombre, apellido o DNI (case-insensitive)
async function buscarClientes(term) {
  const q = term.trim();
  if (!q) return [];

  // %term% para ilike (contiene)
  const like = `%${q}%`;
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombre, apellido, dni, telefono, email")
    .or(`nombre.ilike.${like},apellido.ilike.${like},dni.ilike.${like}`)
    .order("apellido", { ascending: true })
    .limit(20);

  if (error) {
    console.error("Error consultando clientes:", error);
    throw error;
  }
  return data || [];
}

// Pinta resultados en el contenedor .result-list del panel abierto
function renderResultados(listaEl, resultados) {
  if (!listaEl) return;

  if (!resultados.length) {
    listaEl.innerHTML = `<div class="result-item">Sin resultados.</div>`;
    return;
  }

  listaEl.innerHTML = resultados
    .map((c) => {
      const linea =
        `${c.apellido ?? ""} ${c.nombre ?? ""}`.trim() +
        (c.dni ? ` — DNI: ${c.dni}` : "") +
        (c.telefono ? ` — ${c.telefono}` : "") +
        (c.email ? ` — ${c.email}` : "");
      return `
        <div class="result-item">
          <span>${linea}</span>
          <!-- Botones opcionales futuros (ver/editar/eliminar) -->
        </div>`;
    })
    .join("");
}

// Carga dinámica de clientes en el <select>
async function cargarClientesSelect() {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  const select = document.getElementById("ord_cliente");
  select.innerHTML = '<option value="">— Selecciona un cliente —</option>';

  if (error) {
    console.error(error);
    const opt = document.createElement("option");
    opt.textContent = "Error cargando clientes";
    select.appendChild(opt);
    return;
  }

  data.forEach((cli) => {
    const opt = document.createElement("option");
    opt.value = cli.id;
    opt.textContent = cli.nombre;
    select.appendChild(opt);
  });
}

// Crear una nueva orden
async function crearOrden(evt) {
  evt.preventDefault();

  const cliente_id = document.getElementById("ord_cliente").value;
  const equipo = document.getElementById("ord_equipo").value.trim();
  const falla = document.getElementById("ord_falla").value.trim();
  const estado = document.getElementById("ord_estado").value;
  const costo_estimado =
    parseFloat(document.getElementById("ord_costo").value) || null;
  const anticipo =
    parseFloat(document.getElementById("ord_anticipo").value) || 0;
  const fecha_entrega = document.getElementById("ord_fecha").value || null;

  if (!cliente_id || !equipo || !falla) {
    alert("⚠️ Completá los campos obligatorios.");
    return;
  }

  const { data, error } = await supabase
    .from("ordenes")
    .insert([
      {
        cliente_id,
        equipo,
        falla,
        estado,
        costo_estimado,
        anticipo,
        fecha_entrega,
      },
    ])
    .select();

  if (error) {
    console.error(error);
    alert("❌ No se pudo guardar la orden: " + error.message);
  } else {
    alert("✅ Orden registrada correctamente.");
    evt.target.reset();
    listarOrdenes();
  }
}

// Listar las órdenes más recientes
async function listarOrdenes() {
  const { data, error } = await supabase
    .from("ordenes")
    .select(
      `
      id,
      fecha_ingreso,
      equipo,
      estado,
      costo_estimado,
      clientes ( nombre )
    `
    )
    .order("fecha_ingreso", { ascending: false })
    .limit(10);

  const tbody = document.getElementById("tbody_ordenes");
  tbody.innerHTML = "";

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="5">❌ Error cargando órdenes: ${error.message}</td></tr>`;
    return;
  }

  data.forEach((o) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(o.fecha_ingreso).toLocaleDateString()}</td>
      <td>${o.clientes?.nombre || "(Sin cliente)"}</td>
      <td>${o.equipo}</td>
      <td>${o.estado}</td>
      <td>$${o.costo_estimado ?? "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Hooks de UI y arranque ---
document.addEventListener("DOMContentLoaded", () => {
  const formOrden = document.getElementById("form_orden");
  if (formOrden) {
    formOrden.addEventListener("submit", crearOrden);
  }
  // Iniciar funciones principales
  ping();
  listarClientes();
  cargarClientesSelect();
  listarOrdenes();
});

/* ====== DASHBOARD DE CLIENTES ====== */

window.addEventListener("DOMContentLoaded", () => {
  const btnAgregar = document.getElementById("btn_cli_agregar");
  const btnConsultar = document.getElementById("btn_cli_consultar");
  const btnModificar = document.getElementById("btn_cli_modificar");
  const btnEliminar = document.getElementById("btn_cli_eliminar");
  const vistaClientes = document.getElementById("vista_clientes");

  const botones = [btnAgregar, btnConsultar, btnModificar, btnEliminar];

  // --- FIX toggle: cierre inmediato al cambiar de botón, animado al plegar el mismo ---
  let _closeTid = null;

  function ocultarTodasLasVistas(excepto = null, { instant = false } = {}) {
    // Quitar "activo" de todos menos el Excepto
    botones.forEach((b) => {
      if (b !== excepto) b.classList.remove("activo");
    });

    const panel = vistaClientes.querySelector(".card");
    if (!panel) return;

    // Si cambiamos a otro botón, limpiamos de inmediato (sin animación)
    if (instant) {
      clearTimeout(_closeTid);
      vistaClientes.innerHTML = "";
      return;
    }

    // Si estamos plegando el mismo botón, animamos el cierre
    panel.classList.add("cerrando");
    clearTimeout(_closeTid);
    _closeTid = setTimeout(() => {
      vistaClientes.innerHTML = "";
    }, 220); // 220ms combina bien con tu CSS
  }

  function togglePanel(boton, contenidoHTML) {
    const yaActivo = boton.classList.contains("activo");

    if (yaActivo) {
      // Plegar el mismo panel con animación
      ocultarTodasLasVistas(null, { instant: false });
      boton.classList.remove("activo");
      return;
    }

    // Cambiar a otro botón: limpiar inmediatamente, activar nuevo y abrir
    ocultarTodasLasVistas(boton, { instant: true });
    boton.classList.add("activo");

    vistaClientes.innerHTML = contenidoHTML;

    // Disparar la animación de apertura
    requestAnimationFrame(() => {
      const nuevoPanel = vistaClientes.querySelector(".card");
      if (nuevoPanel) nuevoPanel.classList.add("abriendo");
    });
  }

  btnAgregar?.addEventListener("click", () => {
    togglePanel(
      btnAgregar,
      `
      <form id="form_agregar" class="card cli-grid">
        <h3>Agregar cliente</h3>

        <label>Nombre*</label>
        <input id="ag_nombre" type="text" required />

        <label>Apellido*</label>
        <input id="ag_apellido" type="text" required />

        <label>DNI*</label>
        <input id="ag_dni" type="text" required />

        <label>Teléfono</label>
        <input id="ag_tel" type="text" />

        <label>Email</label>
        <input id="ag_email" type="email" />

        <button type="submit">Guardar</button>
      </form>
    `
    );

    // engancha eventos del formulario recién insertado
    attachAgregarHandlers();
  });

  btnConsultar.addEventListener("click", () => {
    togglePanel(
      btnConsultar,
      `
      <div class="card panel">
        <h3>Consultar cliente</h3>
        <input id="con_buscar" type="text" placeholder="Buscar por nombre, apellido o DNI">
        <div id="con_resultados" class="result-list"></div>
      </div>
    `
    );
    // <- importante para “enganchar” eventos luego de inyectar el panel
    setTimeout(attachConsultarHandlers, 0);
  });

  btnModificar.addEventListener("click", () =>
    togglePanel(
      btnModificar,
      `
      <div class="card panel">
        <h3>Modificar cliente</h3>
        <input type="text" placeholder="Buscar cliente por nombre o DNI">
        <div class="result-list"></div>
      </div>`
    )
  );

  btnEliminar.addEventListener("click", () =>
    togglePanel(
      btnEliminar,
      `
      <div class="card panel">
        <h3>Eliminar cliente</h3>
        <input type="text" placeholder="Buscar cliente para eliminar">
        <div class="result-list"></div>
      </div>`
    )
  );
});

async function attachAgregarHandlers() {
  const form = document.getElementById("form_agregar");
  if (!form) return;

  // Evitamos duplicar listeners si reabres el panel
  if (form.dataset.bound === "1") return;
  form.dataset.bound = "1";

  form.addEventListener(
    "submit",
    async (evt) => {
      evt.preventDefault();

      const inputs = form.querySelectorAll("input");
      const nombre = inputs[0]?.value.trim() || "";
      const apellido = inputs[1]?.value.trim() || "";
      const dni = inputs[2]?.value.trim() || "";
      const telefono = inputs[3]?.value.trim() || null;
      const email = inputs[4]?.value.trim() || null;

      if (!nombre || !apellido || !dni) {
        alert("Nombre, Apellido y DNI son obligatorios.");
        return;
      }

      const { data, error } = await supabase
        .from("clientes")
        .insert([{ nombre, apellido, dni, telefono, email }])
        .select("id, nombre, apellido");

      if (error) {
        console.error(error);
        alert("❌ No se pudo crear el cliente: " + error.message);
        return;
      }

      alert(`✅ Cliente creado: ${data[0].nombre} ${data[0].apellido}`);
      form.reset();

      // refrescos rápidos
      ping();
      listarClientes();

      // cierra el panel activo
      const activo = document.querySelector(".dash-btn.activo");
      if (activo) activo.click();
    },
    { once: true }
  );
}

async function attachConsultarHandlers() {
  console.log("[Consultar] attachConsultarHandlers()");

  const input = document.getElementById("con_buscar");
  const lista = document.getElementById("con_resultados");
  console.log("[Consultar] input:", !!input, "lista:", !!lista);

  if (!input || !lista) return;

  lista.innerHTML = `<div class="result-item">Escribí al menos 2 caracteres…</div>`;

  let t = null;
  input.addEventListener("input", () => {
    const term = input.value.trim();
    console.log("[Consultar] input term:", term);

    clearTimeout(t);
    if (term.length < 2) {
      lista.innerHTML = `<div class="result-item">Escribí al menos 2 caracteres…</div>`;
      return;
    }

    lista.innerHTML = `<div class="result-item">Buscando…</div>`;
    t = setTimeout(async () => {
      try {
        const resultados = await buscarClientes(term);
        console.log("[Consultar] resultados:", resultados?.length || 0);
        renderResultados(lista, resultados);
      } catch (err) {
        console.error("[Consultar] error:", err);
        lista.innerHTML = `<div class="result-item">❌ Error: ${err.message}</div>`;
      }
    }, 220);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const term = input.value.trim();
      if (term.length >= 2) {
        lista.innerHTML = `<div class="result-item">Buscando…</div>`;
        buscarClientes(term)
          .then((res) => renderResultados(lista, res))
          .catch((err) => {
            console.error("[Consultar] error enter:", err);
            lista.innerHTML = `<div class="result-item">❌ Error: ${err.message}</div>`;
          });
      }
    }
  });

  // Autoselección del input
  setTimeout(() => input.focus(), 0);
}
