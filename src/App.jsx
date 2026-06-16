import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Zap, Gauge, Power, BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import "./App.css";

import logoIzquierdo from "./assets/logo-izquierdo.jpg";
import logoExtra from "./assets/logo-extra.png";
import logoDerecho from "./assets/logo-derecho.jpeg";

const SIN_DATO = "-/-";
const LIMITE_DESCONEXION_MS = 10000;
const INTERVALO_CONSULTA_MS = 0.5;
const MAX_HISTORICO = 600;

const API_URL = "https://interfaz-electrica-backend.onrender.com/datos";
// const API_URL = "http://localhost:3001/datos";

const COLORES = {
  faseA: "#2563eb",
  faseB: "#16a34a",
  faseC: "#dc2626",

  activaA: "#7c3aed",
  activaB: "#00ddff",
  activaC: "#dd00ff",

  reactivaA: "#ff5900",
  reactivaB: "#5500ff",
  reactivaC: "#84f675",

  activaTotal: "#9f41f7",
  reactivaTotal: "#00ff22",
  aparenteTotal: "#1bb1d7",

  fpA: "#2563eb",
  fpB: "#2563eb",
  fpC: "#2563eb",
  fpTotal: "#2563eb",
};

const initialData = {
  faseA: {
    nombre: "Fase A",
    voltaje: SIN_DATO,
    corriente: SIN_DATO,
    potenciaActiva: SIN_DATO,
    potenciaReactiva: SIN_DATO,
    factorPotencia: SIN_DATO,
    activa: false,
  },
  faseB: {
    nombre: "Fase B",
    voltaje: SIN_DATO,
    corriente: SIN_DATO,
    potenciaActiva: SIN_DATO,
    potenciaReactiva: SIN_DATO,
    factorPotencia: SIN_DATO,
    activa: false,
  },
  faseC: {
    nombre: "Fase C",
    voltaje: SIN_DATO,
    corriente: SIN_DATO,
    potenciaActiva: SIN_DATO,
    potenciaReactiva: SIN_DATO,
    factorPotencia: SIN_DATO,
    activa: false,
  },
};

const initialTotales = {
  potenciaActivaTotal: SIN_DATO,
  potenciaReactivaTotal: SIN_DATO,
  potenciaAparenteTotal: SIN_DATO,
  factorPotenciaTotal: SIN_DATO,
};

function formatearValor(valor, decimales = 2) {
  if (
    valor === SIN_DATO ||
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return SIN_DATO;
  }

  const numero = Number(valor);
  return Number.isNaN(numero) ? SIN_DATO : numero.toFixed(decimales);
}

function convertirNumero(valor) {
  if (
    valor === SIN_DATO ||
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return NaN;
  }

  return Number(String(valor).replace(",", "."));
}

function datosEstanVigentes(datos) {
  if (!datos?.receivedAt) return false;

  const recibido = new Date(datos.receivedAt).getTime();

  if (Number.isNaN(recibido)) return false;

  return Date.now() - recibido <= LIMITE_DESCONEXION_MS;
}

function calcularDominioAuto(data, lineas) {
  const valores = [];

  data.forEach((punto) => {
    lineas.forEach((linea) => {
      const valor = Number(punto[linea.dataKey]);

      if (!Number.isNaN(valor)) {
        valores.push(valor);
      }
    });
  });

  if (valores.length === 0) {
    return [0, 1];
  }

  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);

  if (minimo >= 0) {
    const margenSuperior = maximo * 0.15 || 1;
    return [0, maximo + margenSuperior];
  }

  const margen = (maximo - minimo) * 0.15 || 1;
  return [minimo - margen, maximo + margen];
}

function TooltipCompacto({ active, payload, label, unidad }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="tooltip-compacto">
      <div className="tooltip-hora">
        {new Date(label).toLocaleString("es-CO", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </div>

      <div className="tooltip-lista">
        {payload.map((item) => (
          <div className="tooltip-fila" key={item.dataKey}>
            <span
              className="tooltip-color"
              style={{ backgroundColor: item.color }}
            ></span>

            <span className="tooltip-nombre">{item.name}</span>

            <strong className="tooltip-valor">
              {Number(item.value).toFixed(unidad === "FP" ? 4 : 2)} {unidad}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusLed({ active, voltaje }) {
  const voltajeNumerico = Number(String(voltaje).replace(",", "."));

  return (
    <div className="status-led">
      <span
        className={
          active
            ? voltajeNumerico < 115
              ? "led led-orange"
              : "led led-green"
            : "led led-red"
        }
      ></span>

      <span>
        {active
          ? voltajeNumerico < 115
            ? "Bajo voltaje"
            : "Activo"
          : "Sin señal"}
      </span>
    </div>
  );
}

function DataBox({ label, value, unit, icon: Icon }) {
  return (
    <div className="data-box">
      <div className="data-label">
        {Icon && <Icon size={18} />}
        <span>{label}</span>
      </div>

      <div className="data-value">
        <strong>{value}</strong>
        <span>{value === SIN_DATO ? "" : unit}</span>
      </div>
    </div>
  );
}

function PhaseCard({ phase }) {
  return (
    <div className="phase-card">
      <div className="phase-header">
        <h2>{phase.nombre}</h2>
        <StatusLed active={phase.activa} 
                    voltaje={phase.voltaje}/>
      </div>

      <div className="phase-grid">
        <DataBox
          label="Voltaje"
          value={formatearValor(phase.voltaje)}
          unit="V"
          icon={Zap}
        />

        <DataBox
          label="Corriente"
          value={formatearValor(phase.corriente)}
          unit="A"
          icon={Activity}
        />

        <DataBox
          label="Potencia activa"
          value={formatearValor(phase.potenciaActiva)}
          unit="kW"
          icon={Power}
        />

        <DataBox
          label="Potencia reactiva"
          value={formatearValor(phase.potenciaReactiva)}
          unit="kVAr"
          icon={Gauge}
        />

        <DataBox
          label="Factor de potencia"
          value={formatearValor(phase.factorPotencia, 4)}
          unit="FP"
          icon={Gauge}
        />
      </div>
    </div>
  );
}

function MedidorFactorPotencia({ titulo, valor, color }) {
  const fp = Number(valor || 0);
  const fpLimitado = Math.max(-1, Math.min(1, fp));

  const angulo = 180 - ((fpLimitado + 1) / 2) * 180;
  const rad = (angulo * Math.PI) / 180;

  const cx = 110;
  const cy = 105;
  const r = 78;

  const x = cx + r * Math.cos(rad);
  const y = cy - r * Math.sin(rad);

  return (
    <div className="fp-gauge-card">
      <h3>{titulo}</h3>

      <svg viewBox="0 0 220 135" className="fp-gauge">
        <path
          d="M 30 105 A 80 80 0 0 1 190 105"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="18"
          strokeLinecap="round"
        />

        <path
          d="M 30 105 A 80 80 0 0 1 110 25"
          fill="none"
          stroke="#ef4444"
          strokeWidth="10"
          strokeLinecap="round"
        />

        <path
          d="M 110 25 A 80 80 0 0 1 190 105"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
        />

        <line
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
        />

        <circle cx={cx} cy={cy} r="6" fill={color} />

        <text x="25" y="126" className="fp-label">
          -1
        </text>

        <text x="103" y="20" className="fp-label">
          0
        </text>

        <text x="184" y="126" className="fp-label">
          1
        </text>
      </svg>

      <strong className="fp-value" style={{ color }}>
        {fp.toFixed(4)}
      </strong>
    </div>
  );
}

function GraficaLinea({ titulo, data, lineas, unidad }) {
  const dominioY = calcularDominioAuto(data, lineas);

  return (
    <div className="chart-card">
      <h2>{titulo}</h2>

      <ResponsiveContainer width="100%" height={280} debounce={80}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 25, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) =>
              new Date(value).toLocaleTimeString("es-CO", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            }
            interval="preserveStartEnd"
            minTickGap={150}
          />

          <YAxis
            domain={dominioY}
            allowDataOverflow={false}
            tickFormatter={(value) => Number(value).toFixed(2)}
          />

          <Tooltip
            content={<TooltipCompacto unidad={unidad} />}
            wrapperStyle={{ outline: "none" }}
          />

          <Legend />

          {lineas.map((linea) => (
            <Line
              key={linea.dataKey}
              type="linear"
              dataKey={linea.dataKey}
              name={linea.name}
              stroke={linea.color}
              strokeWidth={2}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls={true}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function App() {
  const [vista, setVista] = useState("monitor");
  const [data, setData] = useState(initialData);
  const [frecuencia, setFrecuencia] = useState(SIN_DATO);
  const [conectado, setConectado] = useState(false);
  const [totalesLabVIEW, setTotalesLabVIEW] = useState(initialTotales);
  const [historico, setHistorico] = useState([]);

  const ultimoReceivedAtRef = useRef(null);
  const consultandoRef = useRef(false);

  const limpiarDatos = () => {
    setData(initialData);
    setFrecuencia(SIN_DATO);
    setConectado(false);
    setTotalesLabVIEW(initialTotales);
  };

  useEffect(() => {
    const obtenerDatos = async () => {
      if (consultandoRef.current) return;

      consultandoRef.current = true;

      try {
        const respuesta = await fetch(API_URL, {
          cache: "no-store",
        });

        if (!respuesta.ok) {
          limpiarDatos();
          return;
        }

        const datos = await respuesta.json();

        if (!datosEstanVigentes(datos)) {
          limpiarDatos();
          return;
        }

        setConectado(true);

        setData({
          faseA: {
            nombre: "Fase A",
            ...datos.faseA,
            activa: true,
          },
          faseB: {
            nombre: "Fase B",
            ...datos.faseB,
            activa: true,
          },
          faseC: {
            nombre: "Fase C",
            ...datos.faseC,
            activa: true,
          },
        });

        setTotalesLabVIEW({
          potenciaActivaTotal: datos.totales?.potenciaActivaTotal ?? SIN_DATO,
          potenciaReactivaTotal:
            datos.totales?.potenciaReactivaTotal ?? SIN_DATO,
          potenciaAparenteTotal:
            datos.totales?.potenciaAparenteTotal ?? SIN_DATO,
          factorPotenciaTotal: datos.totales?.factorPotenciaTotal ?? SIN_DATO,
        });

        setFrecuencia(datos.frecuencia ?? SIN_DATO);

        const esDatoNuevo =
          datos.receivedAt && datos.receivedAt !== ultimoReceivedAtRef.current;

        if (esDatoNuevo) {
          ultimoReceivedAtRef.current = datos.receivedAt;

          const punto = {
            timestamp: datos.receivedAt,

            voltajeA: Number(datos.faseA?.voltaje || 0),
            voltajeB: Number(datos.faseB?.voltaje || 0),
            voltajeC: Number(datos.faseC?.voltaje || 0),

            corrienteA: Number(datos.faseA?.corriente || 0),
            corrienteB: Number(datos.faseB?.corriente || 0),
            corrienteC: Number(datos.faseC?.corriente || 0),

            potenciaActivaA: Number(datos.faseA?.potenciaActiva || 0),
            potenciaActivaB: Number(datos.faseB?.potenciaActiva || 0),
            potenciaActivaC: Number(datos.faseC?.potenciaActiva || 0),

            potenciaReactivaA: Number(datos.faseA?.potenciaReactiva || 0),
            potenciaReactivaB: Number(datos.faseB?.potenciaReactiva || 0),
            potenciaReactivaC: Number(datos.faseC?.potenciaReactiva || 0),

            activaTotal: Number(datos.totales?.potenciaActivaTotal || 0),
            reactivaTotal: Number(datos.totales?.potenciaReactivaTotal || 0),
            aparenteTotal: Number(datos.totales?.potenciaAparenteTotal || 0),

            fpA: Number(datos.faseA?.factorPotencia || 0),
            fpB: Number(datos.faseB?.factorPotencia || 0),
            fpC: Number(datos.faseC?.factorPotencia || 0),
            fpTotal: Number(datos.totales?.factorPotenciaTotal || 0),
          };

          setHistorico((prev) => [
            ...prev.slice(-MAX_HISTORICO + 1),
            punto,
          ]);
        }
      } catch (error) {
        limpiarDatos();
        console.error("Error leyendo datos:", error);
      } finally {
        consultandoRef.current = false;
      }
    };

    obtenerDatos();

    const intervalo = setInterval(obtenerDatos, INTERVALO_CONSULTA_MS);

    return () => clearInterval(intervalo);
  }, []);

  const resumen = useMemo(() => {
    if (!conectado) {
      return {
        voltajePromedio: SIN_DATO,
        corrienteTotal: SIN_DATO,
      };
    }

    const fases = Object.values(data);

    return {
      voltajePromedio:
        fases.reduce((acc, f) => acc + Number(f.voltaje || 0), 0) /
        fases.length,
      corrienteTotal: fases.reduce(
        (acc, f) => acc + Number(f.corriente || 0),
        0
      ),
    };
  }, [data, conectado]);

  const ultimoPunto = historico[historico.length - 1] || {};

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="header-logos-left">
            <img
              className="header-logo"
              src={logoIzquierdo}
              alt="Logo izquierdo"
            />

            <img
              className="header-logo header-logo-extra"
              src={logoExtra}
              alt="Logo extra"
            />
          </div>

          <div className="header-title">
            <h1>Monitor eléctrico trifásico</h1>
            <p>Interfaz de visualización de variables eléctricas por fase.</p>

            <div
              className={
                conectado ? "conexion ok-conexion" : "conexion error-conexion"
              }
            >
              {conectado
                ? "Conectado con LabVIEW"
                : "Sin comunicación con LabVIEW"}
            </div>
          </div>

          <div className="buttons">
            <button
              className="btn-secondary"
              onClick={() =>
                setVista(vista === "monitor" ? "graficas" : "monitor")
              }
            >
              <BarChart3 size={16} />
              {vista === "monitor" ? "Ver gráficas" : "Ver monitor"}
            </button>
          </div>

          <img
            className="header-logo header-logo-right"
            src={logoDerecho}
            alt="Logo derecho"
          />
        </header>

        {vista === "monitor" ? (
          <main className="main-grid">
            <section className="phases-section">
              {Object.values(data).map((phase) => (
                <PhaseCard key={phase.nombre} phase={phase} />
              ))}
            </section>

            <aside className="summary-section">
              <div className="summary-card">
                <h2>Totales del sistema</h2>

                <DataBox
                  label="Potencia activa total"
                  value={formatearValor(totalesLabVIEW.potenciaActivaTotal)}
                  unit="kW"
                  icon={Power}
                />

                <DataBox
                  label="Potencia reactiva total"
                  value={formatearValor(totalesLabVIEW.potenciaReactivaTotal)}
                  unit="kVAr"
                  icon={Gauge}
                />

                <DataBox
                  label="Potencia aparente total"
                  value={formatearValor(totalesLabVIEW.potenciaAparenteTotal)}
                  unit="kVA"
                  icon={Power}
                />

                <DataBox
                  label="Factor de potencia total"
                  value={formatearValor(totalesLabVIEW.factorPotenciaTotal, 4)}
                  unit="FP"
                  icon={Gauge}
                />

                <DataBox
                  label="Frecuencia"
                  value={formatearValor(frecuencia)}
                  unit="Hz"
                  icon={Activity}
                />
              </div>

              <div className="summary-card">
                <h2>Resumen rápido</h2>

                <div className="summary-row">
                  <span>Voltaje promedio</span>
                  <strong>
                    {resumen.voltajePromedio === SIN_DATO
                      ? SIN_DATO
                      : `${formatearValor(resumen.voltajePromedio)} V`}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>Corriente total</span>
                  <strong>
                    {resumen.corrienteTotal === SIN_DATO
                      ? SIN_DATO
                      : `${formatearValor(resumen.corrienteTotal)} A`}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>Estado general</span>
                  <strong className={conectado ? "ok" : "error-text"}>
                    {conectado ? "Normal" : "Sin comunicación"}
                  </strong>
                </div>
              </div>
            </aside>
          </main>
        ) : (
          <main className="charts-layout">
            <section className="fp-grid">
              <MedidorFactorPotencia
                titulo="FP Fase A"
                valor={ultimoPunto.fpA}
                color={COLORES.fpA}
              />

              <MedidorFactorPotencia
                titulo="FP Fase B"
                valor={ultimoPunto.fpB}
                color={COLORES.fpB}
              />

              <MedidorFactorPotencia
                titulo="FP Fase C"
                valor={ultimoPunto.fpC}
                color={COLORES.fpC}
              />

              <MedidorFactorPotencia
                titulo="FP Total"
                valor={ultimoPunto.fpTotal}
                color={COLORES.fpTotal}
              />
            </section>

            <GraficaLinea
              titulo="Voltajes por fase"
              data={historico}
              unidad="V"
              lineas={[
                { dataKey: "voltajeA", name: "Fase A", color: COLORES.faseA },
                { dataKey: "voltajeB", name: "Fase B", color: COLORES.faseB },
                { dataKey: "voltajeC", name: "Fase C", color: COLORES.faseC },
              ]}
            />

            <GraficaLinea
              titulo="Corrientes por fase"
              data={historico}
              unidad="A"
              lineas={[
                {
                  dataKey: "corrienteA",
                  name: "Fase A",
                  color: COLORES.faseA,
                },
                {
                  dataKey: "corrienteB",
                  name: "Fase B",
                  color: COLORES.faseB,
                },
                {
                  dataKey: "corrienteC",
                  name: "Fase C",
                  color: COLORES.faseC,
                },
              ]}
            />

            <GraficaLinea
              titulo="Potencia activa por fase"
              data={historico}
              unidad="kW"
              lineas={[
                {
                  dataKey: "potenciaActivaA",
                  name: "Activa A",
                  color: COLORES.activaA,
                },
                {
                  dataKey: "potenciaActivaB",
                  name: "Activa B",
                  color: COLORES.activaB,
                },
                {
                  dataKey: "potenciaActivaC",
                  name: "Activa C",
                  color: COLORES.activaC,
                },
              ]}
            />

            <GraficaLinea
              titulo="Potencia reactiva por fase"
              data={historico}
              unidad="kVAr"
              lineas={[
                {
                  dataKey: "potenciaReactivaA",
                  name: "Reactiva A",
                  color: COLORES.reactivaA,
                },
                {
                  dataKey: "potenciaReactivaB",
                  name: "Reactiva B",
                  color: COLORES.reactivaB,
                },
                {
                  dataKey: "potenciaReactivaC",
                  name: "Reactiva C",
                  color: COLORES.reactivaC,
                },
              ]}
            />

            <GraficaLinea
              titulo="Potencias totales"
              data={historico}
              unidad="kW / kVAr / kVA"
              lineas={[
                {
                  dataKey: "activaTotal",
                  name: "Activa total",
                  color: COLORES.activaTotal,
                },
                {
                  dataKey: "reactivaTotal",
                  name: "Reactiva total",
                  color: COLORES.reactivaTotal,
                },
                {
                  dataKey: "aparenteTotal",
                  name: "Aparente total",
                  color: COLORES.aparenteTotal,
                },
              ]}
            />
          </main>
        )}
      </div>
    </div>
  );
}